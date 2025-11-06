const User = require('../models/User.model');
const { generateToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');
const { ROLES } = require('../config/constants');

// @desc    Check if system setup is required
// @route   GET /api/auth/setup-status
// @access  Public
exports.getSetupStatus = async (req, res, next) => {
  try {
    const superadminExists = await User.findOne({ 
      globalRole: ROLES.SUPERADMIN 
    });

    return success(res, {
      setupRequired: !superadminExists,
      setupComplete: !!superadminExists
    }, 'Setup status retrieved');
  } catch (err) {
    next(err);
  }
};

// @desc    Setup first superadmin (only if none exists)
// @route   POST /api/auth/setup
// @access  Public (but only works if no superadmin exists)
exports.setupSuperadmin = async (req, res, next) => {
  try {
    // Check if any superadmin already exists
    const existingSuperadmin = await User.findOne({ 
      globalRole: ROLES.SUPERADMIN 
    });

    if (existingSuperadmin) {
      return error(res, 'Superadmin already exists. Setup has been completed. Please use login.', 403);
    }

    const { name, email, password, phone, department } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return error(res, 'Name, email and password are required', 400);
    }

    // Create first superadmin
    const superadmin = await User.create({
      name,
      email,
      password,
      globalRole: ROLES.SUPERADMIN,
      department: department || 'Administration',
      phone,
      isActive: true,
      createdBy: null // First user has no creator
    });

    // Generate token
    const token = generateToken({
      userId: superadmin._id,
      globalRole: superadmin.globalRole,
      email: superadmin.email
    });

    return success(res, {
      token,
      user: {
        _id: superadmin._id,
        name: superadmin.name,
        email: superadmin.email,
        globalRole: superadmin.globalRole,
        department: superadmin.department,
        phone: superadmin.phone
      }
    }, 'Superadmin created successfully. System setup complete!', 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Register/Create new user
// @route   POST /api/auth/register
// @access  Private (Superadmin/Team Lead)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, globalRole, department, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(res, 'User with this email already exists', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      globalRole,
      department,
      phone,
      createdBy: req.user._id
    });

    // Create notification for new user
    await createNotification({
      userId: user._id,
      type: 'user_created',
      title: 'Welcome to Task Manager',
      message: `Your account has been created by ${req.user.name}`,
      referenceId: user._id,
      referenceType: 'user'
    });

    return success(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
        department: user.department
      }
    }, 'User created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return error(res, 'Please provide email and password', 400);
    }

    // Check user exists and get password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return error(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return error(res, 'Your account has been deactivated', 403);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return error(res, 'Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      userId: user._id,
      globalRole: user.globalRole,
      email: user.email
    });

    return success(res, {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
        department: user.department,
        phone: user.phone,
        profilePic: user.profilePic
      }
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    return success(res, { user }, 'User retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// Helper function to create notifications
async function createNotification(data) {
  const Notification = require('../models/Notification.model');
  try {
    await Notification.create(data);
  } catch (err) {
    console.error('Notification creation failed:', err);
  }
}