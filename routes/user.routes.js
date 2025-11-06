const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth');
const { authorize, isSuperadminOrTeamlead } = require('../middlewares/roleCheck');
const { validate } = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

// Get all users
router.get('/', protect, isSuperadminOrTeamlead, userController.getAllUsers);

// Get users by role
router.get('/role/:role', protect, userController.getUsersByRole);

// Get single user
router.get('/:id', protect, userController.getUser);

// Update user
router.put('/:id', protect, isSuperadminOrTeamlead, userController.updateUser);

// Delete user (Superadmin only)
router.delete('/:id', protect, authorize(ROLES.SUPERADMIN), userController.deleteUser);

module.exports = router;
