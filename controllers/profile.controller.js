const User = require('../models/User.model');
const { success, error } = require('../utils/response');

// @desc    Get own profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('createdBy', 'name email');

    if (!user) {
      return error(res, 'User not found', 404);
    }

    return success(res, { user }, 'Profile retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Update own profile (limited fields)
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return error(res, 'User not found', 404);
    }

    // Only allow updating specific fields
    const allowedFields = ['name', 'gender', 'dateOfBirth', 'address', 'phone', 'profilePic'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Apply updates
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });

    await user.save();

    return success(res, { 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        profilePic: user.profilePic,
        globalRole: user.globalRole,
        department: user.department,
        employeeId: user.employeeId,
        dateOfJoining: user.dateOfJoining
      }
    }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Change own password
// @route   PUT /api/profile/password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return error(res, 'Please provide current password, new password and confirmation', 400);
    }

    if (newPassword !== confirmPassword) {
      return error(res, 'New password and confirmation do not match', 400);
    }

    if (newPassword.length < 6) {
      return error(res, 'New password must be at least 6 characters', 400);
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return error(res, 'User not found', 404);
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return error(res, 'Current password is incorrect', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Upload profile picture
// @route   POST /api/profile/upload-picture
// @access  Private
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    const { profilePic } = req.body;

    if (!profilePic) {
      return error(res, 'Profile picture URL is required', 400);
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return error(res, 'User not found', 404);
    }

    user.profilePic = profilePic;
    await user.save();

    return success(res, { 
      profilePic: user.profilePic 
    }, 'Profile picture updated successfully');
  } catch (err) {
    next(err);
  }
};