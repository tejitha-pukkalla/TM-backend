const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth');

router.get('/stats', protect, dashboardController.getDashboardStats);
router.get('/activities', protect, dashboardController.getRecentActivities);

module.exports = router;