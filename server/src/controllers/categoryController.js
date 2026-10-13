const mongoose = require('mongoose');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

/**
 * Fetch all active categories
 * GET /api/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true });
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
 * Fetch single category by slug
 * GET /api/categories/:slug
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
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image, isActive } = req.body;

    // Require slug before normalization
    if (!slug || !slug.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category slug is required'
      });
    }

    const normalizedSlug = slug.toString().toLowerCase().trim();

    // Duplicate slug check
    const existing = await Category.findOne({ slug: normalizedSlug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category with this slug already exists'
      });
    }

    const category = await Category.create({
      name,
      slug: normalizedSlug,
      description,
      image,
      isActive: isActive !== undefined ? isActive : true
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
        message: 'A category with this slug already exists'
      });
    }
    next(error);
  }
};

/**
 * Update category details
 * PUT /api/categories/:id
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
    const whitelist = ['name', 'slug', 'description', 'image', 'isActive'];
    const updateObj = {};
    for (const key of whitelist) {
      if (req.body[key] !== undefined) {
        updateObj[key] = req.body[key];
      }
    }

    // Slug normalization + uniqueness check (exclude self)
    if (updateObj.slug !== undefined) {
      const normalizedSlug = updateObj.slug.toString().toLowerCase().trim();
      updateObj.slug = normalizedSlug;
      const slugConflict = await Category.findOne({ slug: normalizedSlug, _id: { $ne: id } });
      if (slugConflict) {
        return res.status(409).json({
          success: false,
          message: 'A category with this slug already exists'
        });
      }
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
        message: 'A category with this slug already exists'
      });
    }
    next(error);
  }
};

/**
 * Activate or deactivate a category
 * PATCH /api/categories/:id/status
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
        message: 'Cannot delete category because menu items are assigned to it',
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
  getCategoryBySlug,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory
};
