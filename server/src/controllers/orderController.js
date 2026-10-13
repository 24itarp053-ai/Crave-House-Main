const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

/**
 * @desc    Create new customer order
 * @route   POST /api/orders
 * @access  Private (Customer only)
 */
const createOrder = async (req, res, next) => {
  try {
    const { orderType, customer, address, dineInDetails, items, payment } = req.body;

    // 1. Basic field validations
    if (!orderType || !['delivery', 'pickup', 'dine-in'].includes(orderType)) {
      return res.status(400).json({
        success: false,
        message: 'Order type must be delivery, pickup, or dine-in'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // 2. Validate customer info matches what checkout sends
    if (!customer || !customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, email and phone are required'
      });
    }

    // 3. Resolve duplicate menu items by merging quantities
    const itemMap = new Map();
    for (const item of items) {
      if (!item.menuItem || !mongoose.Types.ObjectId.isValid(item.menuItem)) {
        return res.status(400).json({
          success: false,
          message: `Invalid MenuItem ID: ${item.menuItem}`
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1'
        });
      }

      const idStr = item.menuItem.toString();
      if (itemMap.has(idStr)) {
        itemMap.set(idStr, itemMap.get(idStr) + qty);
      } else {
        itemMap.set(idStr, qty);
      }
    }

    // 4. Resolve each item from MongoDB and build historical snapshots
    const resolvedItems = [];
    let subtotal = 0;

    for (const [menuItemId, quantity] of itemMap.entries()) {
      const dbItem = await MenuItem.findById(menuItemId);
      
      if (!dbItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item not found for ID: ${menuItemId}`
        });
      }

      if (!dbItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Product "${dbItem.name}" is currently unavailable`
        });
      }

      const itemSubtotal = dbItem.price * quantity;
      subtotal += itemSubtotal;

      resolvedItems.push({
        menuItem: dbItem._id,
        name: dbItem.name,
        image: dbItem.image,
        price: dbItem.price,
        quantity,
        subtotal: itemSubtotal
      });
    }

    // 5. Build pricing structure
    const tax = 0; // matching frontend calculations
    const deliveryFee = 0; // matching frontend calculations
    const discount = 0; // default discount
    const total = subtotal + tax + deliveryFee - discount;

    // 6. Address or Dine-In validation
    let orderAddress = null;
    if (orderType === 'delivery') {
      if (!address || !address.address || !address.city || !address.pincode) {
        return res.status(400).json({
          success: false,
          message: 'Street address, city, and pincode are required for delivery orders'
        });
      }
      orderAddress = {
        address: address.address,
        city: address.city,
        state: address.state || '',
        pincode: address.pincode,
        instructions: address.instructions || ''
      };
    }

    let orderDineInDetails = null;
    if (orderType === 'dine-in') {
      const dineInReq = dineInDetails || req.body.dineInDetails || req.body;
      if (!dineInReq.tableNumber) {
        return res.status(400).json({
          success: false,
          message: 'Table number is required for dine-in orders'
        });
      }
      const guestsNum = parseInt(dineInReq.numberOfGuests, 10);
      if (isNaN(guestsNum) || guestsNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Number of guests must be at least 1'
        });
      }
      orderDineInDetails = {
        tableNumber: dineInReq.tableNumber,
        numberOfGuests: guestsNum,
        dineInInstructions: dineInReq.dineInInstructions || ''
      };
    }

    // 7. Payment validation
    const paymentMethod = payment && payment.method ? payment.method : 'COD';
    const paymentStatus = payment && payment.status ? payment.status : 'Pending';

    // 8. Generate unique order number
    let orderNumber;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const random = Math.floor(100000 + Math.random() * 900000); // 6 digits
      orderNumber = `CH-ORD-${random}`;
      const existing = await Order.findOne({ orderNumber });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    if (!isUnique) {
      orderNumber = `CH-ORD-${Date.now()}`;
    }

    // 9. Save Order
    const newOrder = new Order({
      user: req.user.id, // Enforce authenticated user ownership
      orderNumber,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      orderType,
      address: orderAddress,
      dineInDetails: orderDineInDetails,
      items: resolvedItems,
      pricing: {
        subtotal,
        tax,
        deliveryFee,
        discount,
        total
      },
      payment: {
        method: paymentMethod,
        status: paymentStatus
      },
      status: 'Pending'
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: savedOrder
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders for the authenticated customer
 * @route   GET /api/orders
 * @access  Private (Customer only)
 */
const getOrders = async (req, res, next) => {
  try {
    // Return only orders belonging strictly to the authenticated user
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order details
 * @route   GET /api/orders/:id
 * @access  Private (Customer only, own order only)
 */
const getOrderById = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    // Enforce ownership: query by both order ID and the authenticated user's ID
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id
    });

    if (!order) {
      // Return 404 to avoid exposing order existence to unauthorized users
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all customer orders (Admin only)
 * @route   GET /api/orders/admin
 * @access  Private (Admin only)
 */
const getAdminOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;
    const query = {};

    // Optional status filtering
    if (req.query.status) {
      const allowedStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Allowed values: ${allowedStatuses.join(', ')}`
        });
      }
      query.status = req.query.status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email phone role');

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      limit,
      totalPages,
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order details (Admin only)
 * @route   GET /api/orders/admin/:id
 * @access  Private (Admin only)
 */
const getAdminOrderById = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(orderId).populate('user', 'name email phone role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all customer orders (Owner only)
 * @route   GET /api/orders/owner
 * @access  Private (Owner only)
 */
const getOwnerOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;
    const query = {};

    // Optional status filtering
    if (req.query.status) {
      const allowedStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Allowed values: ${allowedStatuses.join(', ')}`
        });
      }
      query.status = req.query.status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email phone role');

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      limit,
      totalPages,
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order details (Owner only)
 * @route   GET /api/orders/owner/:id
 * @access  Private (Owner only)
 */
const getOwnerOrderById = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(orderId).populate('user', 'name email phone role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order operational status (Admin + Owner)
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Admin + Owner)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const allowedStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Strict lifecycle validation checks
    const allowedTransitions = {
      Pending: ['Confirmed', 'Cancelled'],
      Confirmed: ['Preparing', 'Cancelled'],
      Preparing: ['Ready', 'Cancelled'],
      Ready: ['Completed', 'Cancelled'],
      Completed: [], // Final state
      Cancelled: []  // Final state
    };

    const currentStatus = order.status;

    if (currentStatus !== status) {
      const validNextStatuses = allowedTransitions[currentStatus] || [];
      if (!validNextStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transition from ${currentStatus} to ${status}. Allowed flow: Pending -> Confirmed -> Preparing -> Ready -> Completed`
        });
      }
    }

    order.status = status;
    await order.save();

    const updatedOrder = await Order.findById(orderId).populate('user', 'name email phone role');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order payment status (Admin only)
 * @route   PATCH /api/orders/:id/payment-status
 * @access  Private (Admin only)
 */
const updateOrderPaymentStatus = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const allowedPaymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (!status || !allowedPaymentStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Allowed values: ${allowedPaymentStatuses.join(', ')}`
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { 'payment.status': status },
      { new: true, runValidators: true }
    ).populate('user', 'name email phone role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getAdminOrders,
  getAdminOrderById,
  getOwnerOrders,
  getOwnerOrderById,
  updateOrderStatus,
  updateOrderPaymentStatus
};
