const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const profileController = require('../controllers/profile.controller');
const { protect } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

// Validation for profile update
const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim(),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
  body('address').optional().trim(),
  validate
];

// Validation for password change
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').notEmpty().withMessage('Password confirmation is required'),
  validate
];

// Get own profile
router.get('/', protect, profileController.getProfile);

// Update own profile (limited fields)
router.put('/', protect, updateProfileValidation, profileController.updateProfile);

// Change password
router.put('/password', protect, changePasswordValidation, profileController.changePassword);

// Upload profile picture
router.post('/upload-picture', protect, profileController.uploadProfilePicture);

module.exports = router;