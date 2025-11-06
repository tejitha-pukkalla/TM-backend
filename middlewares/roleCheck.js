const { error } = require('../utils/response');
const { ROLES } = require('../config/constants');

// Check if user has required role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.globalRole)) {
      return error(res, `Role ${req.user.globalRole} is not authorized to access this route`, 403);
    }
    next();
  };
};

// Check if user is Superadmin or Team Lead
exports.isSuperadminOrTeamlead = (req, res, next) => {
  if (![ROLES.SUPERADMIN, ROLES.TEAMLEAD].includes(req.user.globalRole)) {
    return error(res, 'Only Superadmin or Team Lead can perform this action', 403);
  }
  next();
};

// Check if user can create users
exports.canCreateUsers = (req, res, next) => {
  const { globalRole } = req.body;
  const userRole = req.user.globalRole;

  // Superadmin can create anyone
  if (userRole === ROLES.SUPERADMIN) {
    return next();
  }

  // Team Lead can create Project Lead and Member only
  if (userRole === ROLES.TEAMLEAD) {
    if ([ROLES.PROJECTLEAD, ROLES.MEMBER].includes(globalRole)) {
      return next();
    }
    return error(res, 'Team Lead can only create Project Lead or Member', 403);
  }

  return error(res, 'Not authorized to create users', 403);
};
