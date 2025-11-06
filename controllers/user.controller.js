const User = require('../models/User.model');
const { success, error, paginated } = require('../utils/response');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Superadmin/Team Lead)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, department, isActive, search, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.globalRole = role;
    if (department) filter.department = department;
    // if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isActive !== undefined && isActive !== "") {
  filter.isActive = isActive === 'true';
}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    return paginated(res, users, page, limit, total, 'Users retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email');

    if (!user) {
      return error(res, 'User not found', 404);
    }

    return success(res, { user }, 'User retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Superadmin/Team Lead)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, department, phone, globalRole, isActive } = req.body;

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return error(res, 'User not found', 404);
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (department) user.department = department;
    if (phone) user.phone = phone;
    if (globalRole) user.globalRole = globalRole;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    return success(res, { user }, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Delete/Deactivate user
// @route   DELETE /api/users/:id
// @access  Private (Superadmin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return error(res, 'User not found', 404);
    }

    // Soft delete - just deactivate
    user.isActive = false;
    await user.save();

    return success(res, null, 'User deactivated successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private
exports.getUsersByRole = async (req, res, next) => {
  try {
    const users = await User.find({ 
      globalRole: req.params.role,
      isActive: true 
    }).select('name email department');

    return success(res, { users }, 'Users retrieved successfully');
  } catch (err) {
    next(err);
  }
};