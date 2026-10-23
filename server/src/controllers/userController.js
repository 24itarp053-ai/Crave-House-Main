const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private (Authenticated users)
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/profile
 * @access  Private (Authenticated users)
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, email, phone } = req.body;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    // E11000 duplicate email check & normalization
    if (email !== undefined && email.toLowerCase() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email address is already in use'
        });
      }
      user.email = normalizedEmail;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        count: users.length,
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user details by ID (Admin only)
 * @route   GET /api/users/:id
 * @access  Private (Admin only)
 */
const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user status (Admin only)
 * @route   PATCH /api/users/:id/status
 * @access  Private (Admin only)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const allowedStatuses = ['Active', 'Inactive'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    // Self-protection: user cannot deactivate their own account
    if (userId === req.user.id && status === 'Inactive') {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Role hierarchy protection: Admin cannot deactivate an Owner account
    if (user.role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot deactivate an Owner account.'
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user details & role (Admin / Owner)
 * @route   PUT /api/users/:id
 * @access  Private (Admin / Owner)
 */
const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { name, email, phone, role, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Self-protection checks: user cannot demote or deactivate their own account
    if (userId === req.user.id) {
      if (role && role !== req.user.role) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role.'
        });
      }
      if (status === 'Inactive') {
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own account.'
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hierarchy protection: Admin cannot modify an Owner account
    if (user.role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot modify an Owner account.'
      });
    }

    // Hierarchy protection: Only an Owner can assign the 'owner' role
    if (role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only an Owner can assign the Owner role.'
      });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    
    if (role !== undefined) {
      const allowedRoles = ['customer', 'admin', 'owner'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed values: ${allowedRoles.join(', ')}`
        });
      }
      user.role = role;
    }

    if (status !== undefined) {
      const allowedStatuses = ['Active', 'Inactive'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
        });
      }
      user.status = status;
    }

    // E11000 duplicate email check & normalization
    if (email !== undefined && email.toLowerCase() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email address is already in use'
        });
      }
      user.email = normalizedEmail;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change authenticated user password (Customer only)
 * @route   PUT /api/users/change-password
 * @access  Private (Customer only)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 1. Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirm password are required'
      });
    }

    // 2. Length check (must match existing 6-character registration requirements)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // 3. Password confirmation mismatch check
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // 4. Same password block
    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Fetch user selecting select:false password field
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password hash
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (triggers pre-save bcrypt hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUser,
  changePassword
};
