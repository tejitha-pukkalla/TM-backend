const { verifyToken } = require('../utils/jwt');
const User = require('../models/User.model');
const { error } = require('../utils/response');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return error(res, 'Not authorized to access this route', 401);
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return error(res, 'Invalid or expired token', 401);
    }

    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return error(res, 'User not found', 404);
    }

    if (!user.isActive) {
      return error(res, 'User account is deactivated', 403);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    return error(res, 'Not authorized to access this route', 401);
  }
};
