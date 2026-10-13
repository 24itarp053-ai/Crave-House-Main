const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

/**
 * Builds the MongoDB query filter and sorting object from query parameters
 */
const buildMenuQueryAndFilters = async (req) => {
  const queryObj = { isAvailable: true };

  // 1. Category Filter by Slug
  if (req.query.category) {
    const categorySlug = req.query.category.toLowerCase().trim();
    const categoryDoc = await Category.findOne({ slug: categorySlug, isActive: true });
    
    if (!categoryDoc) {
      // Category slug doesn't exist, return a query that yields empty results
      queryObj.category = new mongoose.Types.ObjectId();
    } else {
      queryObj.category = categoryDoc._id;
    }
  }

  // 2. Search query (regex check across name, description, tags, ingredients)
  if (req.query.search) {
    const searchString = req.query.search.trim();
    const regex = new RegExp(searchString, 'i');
    queryObj.$or = [
      { name: regex },
      { description: regex },
      { tags: { $in: [regex] } },
      { ingredients: { $in: [regex] } }
    ];
  }

  // 3. Price Filters
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    queryObj.price = {};
    if (req.query.minPrice !== undefined) {
      const minPrice = Number(req.query.minPrice);
      if (isNaN(minPrice) || minPrice < 0) {
        throw { statusCode: 400, message: 'Invalid minPrice value' };
      }
      queryObj.price.$gte = minPrice;
    }
    if (req.query.maxPrice !== undefined) {
      const maxPrice = Number(req.query.maxPrice);
      if (isNaN(maxPrice) || maxPrice < 0) {
        throw { statusCode: 400, message: 'Invalid maxPrice value' };
      }
      queryObj.price.$lte = maxPrice;
    }

    if (req.query.minPrice !== undefined && req.query.maxPrice !== undefined) {
      const minPrice = Number(req.query.minPrice);
      const maxPrice = Number(req.query.maxPrice);
      if (minPrice > maxPrice) {
        throw { statusCode: 400, message: 'minPrice cannot be greater than maxPrice' };
      }
    }
  }

  // 4. Popular Filter
  if (req.query.popular === 'true') {
    queryObj.isPopular = true;
  }

  // 5. Rating Filter
  if (req.query.minRating !== undefined) {
    const minRating = Number(req.query.minRating);
    if (isNaN(minRating) || minRating < 0 || minRating > 5) {
      throw { statusCode: 400, message: 'minRating must be between 0 and 5' };
    }
    queryObj.rating = { $gte: minRating };
  }

  // 6. Sorting Whitelist
  let sortOption = { name: 1 }; // Default stable sorting
  const allowedSorts = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1 },
    popular: { isPopular: -1, rating: -1 }
  };

  if (req.query.sort && allowedSorts[req.query.sort]) {
    sortOption = allowedSorts[req.query.sort];
  }

  return { queryObj, sortOption };
};

/**
 * Fetch all available menu items with pagination, filtering, searching, and sorting
 * GET /api/menu
 */
const getMenuItems = async (req, res, next) => {
  try {
    const { queryObj, sortOption } = await buildMenuQueryAndFilters(req);

    // Pagination
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 12;

    if (page < 1) page = 1;
    if (limit < 1) limit = 12;

    // Enforce API self-protection limit threshold
    if (limit > 50) {
      limit = 50;
    }

    const skip = (page - 1) * limit;

    const total = await MenuItem.countDocuments(queryObj);
    const items = await MenuItem.find(queryObj)
      .populate('category', 'name slug description image')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Fetch menu items matching category slug path
 * GET /api/menu/category/:slug
 */
const getMenuItemsByCategory = async (req, res, next) => {
  try {
    // Override category filter to look up path parameter slug
    req.query.category = req.params.slug;
    return getMenuItems(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch single menu item by ObjectId
 * GET /api/menu/:id
 */
const getMenuItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    const item = await MenuItem.findOne({ _id: id, isAvailable: true })
      .populate('category', 'name slug description image');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      success: true,
      item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new menu item
 * POST /api/menu
 */
const createMenuItem = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      image,
      category,
      rating,
      reviewCount,
      ingredients,
      nutrition,
      isAvailable,
      isPopular,
      tags
    } = req.body;

    // 1. Category validation
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category reference is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (!categoryDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign menu item to an inactive category'
      });
    }

    // 2. Slug normalization and duplicate checking
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Menu item slug is required'
      });
    }
    const normalizedSlug = slug.toLowerCase().trim();

    const slugExists = await MenuItem.findOne({ slug: normalizedSlug });
    if (slugExists) {
      return res.status(409).json({
        success: false,
        message: 'A menu item with this slug already exists'
      });
    }

    // 3. Create document
    const newItem = await MenuItem.create({
      name,
      slug: normalizedSlug,
      description,
      price,
      image,
      category,
      rating,
      reviewCount,
      ingredients,
      nutrition,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isPopular: isPopular !== undefined ? isPopular : false,
      tags
    });

    const populatedItem = await MenuItem.findById(newItem._id)
      .populate('category', 'name slug description image');

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      item: populatedItem
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        message
      });
    }
    next(error);
  }
};

/**
 * Update a menu item details
 * PUT /api/menu/:id
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Whitelist update fields
    const whitelist = [
      'name',
      'slug',
      'description',
      'price',
      'image',
      'category',
      'rating',
      'reviewCount',
      'ingredients',
      'nutrition',
      'isAvailable',
      'isPopular',
      'tags'
    ];

    // Build update object only containing supplied whitelist fields
    const updateObj = {};
    for (const key of whitelist) {
      if (req.body[key] !== undefined) {
        updateObj[key] = req.body[key];
      }
    }

    // Category validation (if updated)
    if (updateObj.category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(updateObj.category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID'
        });
      }
      const categoryDoc = await Category.findById(updateObj.category);
      if (!categoryDoc) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      if (!categoryDoc.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign menu item to an inactive category'
        });
      }
    }

    // Slug validation (if updated)
    if (updateObj.slug !== undefined) {
      const normalizedSlug = updateObj.slug.toLowerCase().trim();
      updateObj.slug = normalizedSlug;
      const slugExists = await MenuItem.findOne({ slug: normalizedSlug, _id: { $ne: id } });
      if (slugExists) {
        return res.status(409).json({
          success: false,
          message: 'A menu item with this slug already exists'
        });
      }
    }

    // Apply updates manually to trigger schema validations on save()
    Object.keys(updateObj).forEach(key => {
      item[key] = updateObj[key];
    });

    await item.save();

    const populatedItem = await MenuItem.findById(id)
      .populate('category', 'name slug description image');

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      item: populatedItem
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        message
      });
    }
    next(error);
  }
};

/**
 * Toggle menu item availability
 * PATCH /api/menu/:id/availability
 */
const updateMenuItemAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be a boolean'
      });
    }

    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    item.isAvailable = isAvailable;
    await item.save();

    const populatedItem = await MenuItem.findById(id)
      .populate('category', 'name slug description image');

    res.status(200).json({
      success: true,
      message: 'Menu item availability updated successfully',
      item: populatedItem
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Hard delete a menu item
 * DELETE /api/menu/:id
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await MenuItem.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch ALL menu items (including unavailable) — Admin/Owner only
 * GET /api/menu/admin
 */
const getAdminMenuItems = async (req, res, next) => {
  try {
    // Build the same query structure but do NOT restrict by isAvailable
    const queryObj = {};

    // Category Filter by Slug
    if (req.query.category) {
      const categorySlug = req.query.category.toLowerCase().trim();
      const categoryDoc = await Category.findOne({ slug: categorySlug });
      if (!categoryDoc) {
        queryObj.category = new mongoose.Types.ObjectId();
      } else {
        queryObj.category = categoryDoc._id;
      }
    }

    // Search
    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      queryObj.$or = [
        { name: regex },
        { description: regex },
        { tags: { $in: [regex] } },
        { ingredients: { $in: [regex] } }
      ];
    }

    // Sorting
    const allowedSorts = {
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
      rating:     { rating: -1 },
      popular:    { isPopular: -1, rating: -1 }
    };
    let sortOption = { name: 1 };
    if (req.query.sort && allowedSorts[req.query.sort]) {
      sortOption = allowedSorts[req.query.sort];
    }

    // Pagination
    let page  = parseInt(req.query.page,  10) || 1;
    let limit = parseInt(req.query.limit, 10) || 50;
    if (page  < 1) page  = 1;
    if (limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    const total = await MenuItem.countDocuments(queryObj);
    const items = await MenuItem.find(queryObj)
      .populate('category', 'name slug description image')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenuItems,
  getMenuItemsByCategory,
  getMenuItemById,
  getAdminMenuItems,
  createMenuItem,
  updateMenuItem,
  updateMenuItemAvailability,
  deleteMenuItem
};
