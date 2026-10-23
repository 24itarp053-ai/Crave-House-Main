const mongoose = require('mongoose');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

const RESERVED_SLUGS = ['admin', 'all', 'undefined', 'null', 'api', 'new'];

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Fetch all active categories
 * GET /api/categories
 * Access: Public
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all categories (active & inactive) with menu item count
 * GET /api/categories/admin
 * Access: Private (Admin / Owner)
 */
const getAdminCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
    const counts = await MenuItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => {
      if (c._id) countMap[c._id.toString()] = c.count;
    });

    const enriched = categories.map(cat => ({
      ...cat.toJSON(),
      itemCount: countMap[cat._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      count: enriched.length,
      categories: enriched
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch single category by slug
 * GET /api/categories/:slug
 * Access: Public
 */
const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug.toLowerCase().trim(),
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category
 * POST /api/categories
 * Access: Private (Admin / Owner)
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image, displayOrder, isActive } = req.body;

    if (!name || !name.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const cleanName = name.toString().trim();

    // Auto-generate slug if not provided
    const rawSlug = slug && slug.toString().trim()
      ? slug.toString().trim()
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const normalizedSlug = rawSlug.toLowerCase().trim();

    if (!normalizedSlug) {
      return res.status(400).json({
        success: false,
        message: 'Category slug is required'
      });
    }

    if (RESERVED_SLUGS.includes(normalizedSlug)) {
      return res.status(400).json({
        success: false,
        message: `The slug "${normalizedSlug}" is reserved for system use. Please choose another.`
      });
    }

    // 1. Case-insensitive duplicate name check
    const existingName = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') }
    });
    if (existingName) {
      return res.status(409).json({
        success: false,
        message: `A category with the name "${existingName.name}" already exists`
      });
    }

    // 2. Case-insensitive duplicate slug check
    const existingSlug = await Category.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: `A category with the slug "${normalizedSlug}" already exists`
      });
    }

    const category = await Category.create({
      name: cleanName,
      slug: normalizedSlug,
      description: description ? description.toString().trim() : '',
      image: image ? image.toString().trim() : '',
      displayOrder: displayOrder != null ? Number(displayOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    // E11000 duplicate key (race condition safety net)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name or slug already exists'
      });
    }
    next(error);
  }
};

/**
 * Update category details
 * PUT /api/categories/:id
 * Access: Private (Admin / Owner)
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Whitelist updatable fields
    const whitelist = ['name', 'slug', 'description', 'image', 'displayOrder', 'isActive'];
    const updateObj = {};
    for (const key of whitelist) {
      if (req.body[key] !== undefined) {
        updateObj[key] = req.body[key];
      }
    }

    // Name normalization & case-insensitive duplicate check
    if (updateObj.name !== undefined) {
      const cleanName = updateObj.name.toString().trim();
      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Category name cannot be empty' });
      }
      updateObj.name = cleanName;
      const nameConflict = await Category.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
        _id: { $ne: id }
      });
      if (nameConflict) {
        return res.status(409).json({
          success: false,
          message: `A category with the name "${nameConflict.name}" already exists`
        });
      }
    }

    // Slug normalization + uniqueness check (exclude self)
    if (updateObj.slug !== undefined) {
      const normalizedSlug = updateObj.slug.toString().toLowerCase().trim();
      if (!normalizedSlug) {
        return res.status(400).json({ success: false, message: 'Category slug cannot be empty' });
      }
      if (RESERVED_SLUGS.includes(normalizedSlug)) {
        return res.status(400).json({
          success: false,
          message: `The slug "${normalizedSlug}" is reserved for system use. Please choose another.`
        });
      }
      updateObj.slug = normalizedSlug;
      const slugConflict = await Category.findOne({ slug: normalizedSlug, _id: { $ne: id } });
      if (slugConflict) {
        return res.status(409).json({
          success: false,
          message: `A category with the slug "${normalizedSlug}" already exists`
        });
      }
    }

    if (updateObj.displayOrder !== undefined) {
      updateObj.displayOrder = Number(updateObj.displayOrder) || 0;
    }

    // Apply whitelisted fields and run schema validation via save()
    Object.keys(updateObj).forEach(key => { category[key] = updateObj[key]; });
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name or slug already exists'
      });
    }
    next(error);
  }
};

/**
 * Activate or deactivate a category
 * PATCH /api/categories/:id/status
 * Access: Private (Admin / Owner)
 */
const updateCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isActive = isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category status updated successfully',
      category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a category — blocked if it has assigned MenuItems
 * DELETE /api/categories/:id
 * Access: Private (Admin / Owner)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Referential integrity — block deletion when MenuItems reference this category
    const menuItemCount = await MenuItem.countDocuments({ category: category._id });
    if (menuItemCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category "${category.name}" because ${menuItemCount} menu item(s) are assigned to it. Please reassign or delete the items first.`,
        menuItemCount
      });
    }

    await Category.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getAdminCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory
};
