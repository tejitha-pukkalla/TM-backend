const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize, isSuperadminOrTeamlead } = require('../middlewares/roleCheck');
const { ROLES } = require('../config/constants');
const {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getCurrentStatus,
  getMyAttendance,
  getAllAttendance,
  getTodayAttendance,
  getAttendanceSummary,
  adjustAttendance
} = require('../controllers/attendance.controller');

// =============== PUBLIC ROUTES (Protected - All Users) ===============

// Clock in/out - All authenticated users
router.post('/clock-in', protect, clockIn);
router.post('/clock-out', protect, clockOut);

// Break management - All authenticated users
router.post('/break/start', protect, startBreak);
router.post('/break/end', protect, endBreak);

// Get current status - All authenticated users
router.get('/status', protect, getCurrentStatus);

// Get my attendance history - All authenticated users
router.get('/my-history', protect, getMyAttendance);

// =============== ADMIN ROUTES (SA & TL only) ===============

// Get all attendance records
router.get('/all', protect, isSuperadminOrTeamlead, getAllAttendance);

// Get today's attendance report
router.get('/today', protect, isSuperadminOrTeamlead, getTodayAttendance);

// Get attendance summary/statistics
router.get('/summary', protect, isSuperadminOrTeamlead, getAttendanceSummary);

// Manual adjustment of attendance
router.put('/:id/adjust', protect, isSuperadminOrTeamlead, adjustAttendance);

module.exports = router;