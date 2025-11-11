// const express = require('express');
// const router = express.Router();
// const { body } = require('express-validator');
// const authController = require('../controllers/auth.controller');
// const { protect } = require('../middlewares/auth');
// const { canCreateUsers } = require('../middlewares/roleCheck');
// const { validate } = require('../middlewares/validate');

// // Validation rules for setup
// const setupValidation = [
//   body('name').trim().notEmpty().withMessage('Name is required'),
//   body('email').isEmail().withMessage('Valid email is required'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
//   body('phone').optional().trim(),
//   body('department').optional().trim(),
//   validate
// ];

// // Validation rules for register
// const registerValidation = [
//   body('name').trim().notEmpty().withMessage('Name is required'),
//   body('email').isEmail().withMessage('Valid email is required'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
//   body('globalRole').isIn(['superadmin', 'teamlead', 'projectlead', 'member']).withMessage('Invalid role'),
//   body('phone').optional().trim(),
//   body('department').optional().trim(),
//   validate
// ];

// // Validation rules for login
// const loginValidation = [
//   body('email').isEmail().withMessage('Valid email is required'),
//   body('password').notEmpty().withMessage('Password is required'),
//   validate
// ];

// // ===========================================
// // PUBLIC ROUTES (NO AUTH REQUIRED)
// // ===========================================

// // Check if setup is needed (MUST BE FIRST - before any validation)
// router.get('/setup-status', authController.getSetupStatus);

// // First time setup (create first superadmin)
// router.post('/setup', setupValidation, authController.setupSuperadmin);

// // Login
// router.post('/login', loginValidation, authController.login);


// // ===========================================
// // PROTECTED ROUTES (AUTH REQUIRED)
// // ===========================================

// // Get current user
// router.get('/me', protect, authController.getMe);

// // Create new users (only Superadmin/Team Lead)
// router.post('/register', protect, canCreateUsers, registerValidation, authController.register);

// module.exports = router;









const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');
const { canCreateUsers } = require('../middlewares/roleCheck');
const { validate } = require('../middlewares/validate');

// Validation rules for setup
const setupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('department').optional().trim(),
  validate
];

// Validation rules for register (NO DESIGNATION FIELD)
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('globalRole').isIn(['superadmin', 'teamlead', 'projectlead', 'member']).withMessage('Invalid role'),
  body('phone').trim().notEmpty().withMessage('Phone is required for password generation'),
  body('department').optional().trim(),
  body('employeeId').optional().trim(),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
  body('dateOfJoining').optional().isISO8601().withMessage('Invalid date format'),
  body('address').optional().trim(),
  validate
];

// Validation rules for login
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

// ===========================================
// PUBLIC ROUTES (NO AUTH REQUIRED)
// ===========================================

// Check if setup is needed
router.get('/setup-status', authController.getSetupStatus);

// First time setup (create first superadmin)
router.post('/setup', setupValidation, authController.setupSuperadmin);

// Login
router.post('/login', loginValidation, authController.login);

// ===========================================
// PROTECTED ROUTES (AUTH REQUIRED)
// ===========================================

// Get current user
router.get('/me', protect, authController.getMe);

// Create new users (only Superadmin/Team Lead)
router.post('/register', protect, canCreateUsers, registerValidation, authController.register);

module.exports = router;