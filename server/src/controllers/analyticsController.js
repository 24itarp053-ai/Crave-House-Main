const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Reservation = require('../models/Reservation');

/**
 * @desc    Get Admin dashboard analytics and statistics
 * @route   GET /api/analytics/admin
 * @access  Private (Admin only)
 */
const getAdminAnalytics = async (req, res, next) => {
  try {
    // 1. Get total customers count
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // 2. Aggregate general order KPIs
    const orderStatsQuery = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Pending', 'Confirmed', 'Preparing', 'Ready']] },
                1,
                0
              ]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Cancelled'] },
                    { $ne: ['$payment.status', 'Failed'] }
                  ]
                },
                '$pricing.total',
                0
              ]
            }
          }
        }
      }
    ]);

    const orderStats = orderStatsQuery[0] || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0
    };

    const avgOrderValue = (orderStats.totalOrders - orderStats.cancelledOrders) > 0
      ? Math.round(orderStats.totalRevenue / (orderStats.totalOrders - orderStats.cancelledOrders))
      : 0;

    // 3. Last 7 Days Revenue (chronological order)
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      dates.push(d);
    }
    const startOfRange = dates[0];
    const endOfRange = new Date();
    endOfRange.setHours(23, 59, 59, 999);

    const rangeOrders = await Order.find({
      createdAt: { $gte: startOfRange, $lte: endOfRange },
      status: { $ne: 'Cancelled' },
      'payment.status': { $ne: 'Failed' }
    });

    const revenueByDayMap = {};
    dates.forEach(d => {
      const key = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., 'Mon'
      revenueByDayMap[key] = 0;
    });

    rangeOrders.forEach(o => {
      const key = o.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
      if (revenueByDayMap[key] !== undefined) {
        revenueByDayMap[key] += o.pricing.total;
      }
    });

    const revenueByDay = dates.map(d => {
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        day,
        amount: Math.round(revenueByDayMap[day] || 0)
      };
    });

    // 4. Orders by Category (dynamic percentages)
    const ordersByCategoryRaw = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          'payment.status': { $ne: 'Failed' }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItemDetails'
        }
      },
      { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'menuItemDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$categoryDetails.name', 'Other'] },
          orders: { $sum: '$items.quantity' }
        }
      },
      { $sort: { orders: -1 } }
    ]);

    const totalCategoryOrders = ordersByCategoryRaw.reduce((sum, c) => sum + c.orders, 0);
    const ordersByCategory = ordersByCategoryRaw.map(c => ({
      category: c._id,
      orders: c.orders,
      percentage: totalCategoryOrders > 0 ? Math.round((c.orders / totalCategoryOrders) * 100) : 0
    }));

    // 5. Top Selling Foods (top 5 by quantity sold)
    const topFoods = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          'payment.status': { $ne: 'Failed' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          orders: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          orders: 1,
          revenue: 1
        }
      }
    ]);

    const totalReservations = await Reservation.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalOrders: orderStats.totalOrders,
          revenue: orderStats.totalRevenue,
          customers: totalCustomers,
          reservations: totalReservations,
          pendingOrders: orderStats.pendingOrders,
          completedOrders: orderStats.completedOrders,
          cancelledOrders: orderStats.cancelledOrders,
          avgOrderValue
        },
        revenueByDay,
        ordersByCategory,
        topFoods
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Owner dashboard analytics and sales statistics
 * @route   GET /api/analytics/owner
 * @access  Private (Owner only)
 */
const getOwnerAnalytics = async (req, res, next) => {
  try {
    // Calculate date boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 1. Aggregate general owner KPIs
    const ownerStatsQuery = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Pending', 'Confirmed', 'Preparing', 'Ready']] },
                1,
                0
              ]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Cancelled'] },
                    { $ne: ['$payment.status', 'Failed'] }
                  ]
                },
                '$pricing.total',
                0
              ]
            }
          },
          todayOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', todayStart] },
                    { $lte: ['$createdAt', todayEnd] }
                  ]
                },
                1,
                0
              ]
            }
          },
          todayRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', todayStart] },
                    { $lte: ['$createdAt', todayEnd] },
                    { $ne: ['$status', 'Cancelled'] },
                    { $ne: ['$payment.status', 'Failed'] }
                  ]
                },
                '$pricing.total',
                0
              ]
            }
          },
          weeklyRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', sevenDaysAgo] },
                    { $ne: ['$status', 'Cancelled'] },
                    { $ne: ['$payment.status', 'Failed'] }
                  ]
                },
                '$pricing.total',
                0
              ]
            }
          },
          monthlyRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', monthStart] },
                    { $ne: ['$status', 'Cancelled'] },
                    { $ne: ['$payment.status', 'Failed'] }
                  ]
                },
                '$pricing.total',
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = ownerStatsQuery[0] || {
      totalOrders: 0,
      cancelledOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      todayOrders: 0,
      todayRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0
    };

    const avgOrderValue = (stats.totalOrders - stats.cancelledOrders) > 0
      ? Math.round(stats.totalRevenue / (stats.totalOrders - stats.cancelledOrders))
      : 0;

    // 2. Last 7 Days Revenue (chronological order)
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      dates.push(d);
    }
    const startOfRange = dates[0];
    const endOfRange = new Date();
    endOfRange.setHours(23, 59, 59, 999);

    const rangeOrders = await Order.find({
      createdAt: { $gte: startOfRange, $lte: endOfRange },
      status: { $ne: 'Cancelled' },
      'payment.status': { $ne: 'Failed' }
    });

    const revenueByDayMap = {};
    dates.forEach(d => {
      const key = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., 'Mon'
      revenueByDayMap[key] = 0;
    });

    rangeOrders.forEach(o => {
      const key = o.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
      if (revenueByDayMap[key] !== undefined) {
        revenueByDayMap[key] += o.pricing.total;
      }
    });

    const revenueByDay = dates.map(d => {
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        day,
        amount: Math.round(revenueByDayMap[day] || 0)
      };
    });

    // 3. Orders by Category
    const ordersByCategoryRaw = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          'payment.status': { $ne: 'Failed' }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItemDetails'
        }
      },
      { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'menuItemDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$categoryDetails.name', 'Other'] },
          orders: { $sum: '$items.quantity' }
        }
      },
      { $sort: { orders: -1 } }
    ]);

    const totalCategoryOrders = ordersByCategoryRaw.reduce((sum, c) => sum + c.orders, 0);
    const ordersByCategory = ordersByCategoryRaw.map(c => ({
      category: c._id,
      orders: c.orders,
      percentage: totalCategoryOrders > 0 ? Math.round((c.orders / totalCategoryOrders) * 100) : 0
    }));

    const todayReservations = await Reservation.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          todayOrders: stats.todayOrders,
          todayRevenue: stats.todayRevenue,
          pendingOrders: stats.pendingOrders,
          todayReservations,
          weeklyRevenue: stats.weeklyRevenue,
          monthlyRevenue: stats.monthlyRevenue,
          avgOrderValue
        },
        revenueByDay,
        ordersByCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminAnalytics,
  getOwnerAnalytics
};
