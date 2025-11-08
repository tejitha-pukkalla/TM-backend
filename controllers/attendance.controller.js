// const Attendance = require('../models/Attendance.model');
// const User = require('../models/User.model');
// const { success, error } = require('../utils/response');
// const { ATTENDANCE_STATUS, BREAK_TYPES, ROLES } = require('../config/constants');

// // @desc    Clock In
// // @route   POST /api/attendance/clock-in
// // @access  Private (All authenticated users)
// exports.clockIn = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { location } = req.body;

//     // Check if already clocked in today
//     const existingAttendance = await Attendance.getTodayAttendance(userId);
    
//     if (existingAttendance) {
//       return error(res, 'Already clocked in today', 400);
//     }

//     // Create new attendance record
//     const attendance = await Attendance.create({
//       user: userId,
//       loginTime: new Date(),
//       date: new Date(),
//       status: ATTENDANCE_STATUS.PRESENT,
//       loginLocation: {
//         ip: req.ip,
//         device: req.headers['user-agent'],
//         ...location
//       }
//     });

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Clocked in successfully', 201);
//   } catch (err) {
//     console.error('Clock in error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Clock Out
// // @route   POST /api/attendance/clock-out
// // @access  Private
// exports.clockOut = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { location } = req.body;

//     // Get today's attendance
//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     if (!attendance) {
//       return error(res, 'No active clock-in found for today', 400);
//     }

//     if (attendance.logoutTime) {
//       return error(res, 'Already clocked out today', 400);
//     }

//     // Check if any break is still active
//     const activeBreak = attendance.getActiveBreak();
//     if (activeBreak) {
//       return error(res, 'Please end your current break before clocking out', 400);
//     }

//     // Set logout time and calculate durations
//     attendance.logoutTime = new Date();
//     attendance.isActive = false;
//     attendance.logoutLocation = {
//       ip: req.ip,
//       device: req.headers['user-agent'],
//       ...location
//     };

//     attendance.calculateDurations();

//     // Determine if half-day based on working hours
//     const { HALF_DAY_HOURS } = require('../config/constants').ATTENDANCE_RULES;
//     if (attendance.netWorkingMinutes < HALF_DAY_HOURS * 60) {
//       attendance.status = ATTENDANCE_STATUS.HALF_DAY;
//     }

//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Clocked out successfully');
//   } catch (err) {
//     console.error('Clock out error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Start Break
// // @route   POST /api/attendance/break/start
// // @access  Private
// exports.startBreak = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { breakType = BREAK_TYPES.TEA_BREAK, notes } = req.body;

//     // Get today's attendance
//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     if (!attendance) {
//       return error(res, 'Please clock in first', 400);
//     }

//     if (attendance.logoutTime) {
//       return error(res, 'Already clocked out for the day', 400);
//     }

//     // Check if can take break
//     const breakCheck = attendance.canTakeBreak();
//     if (!breakCheck.allowed) {
//       return error(res, breakCheck.reason, 400);
//     }

//     // Add new break
//     attendance.breaks.push({
//       breakType,
//       startTime: new Date(),
//       isActive: true,
//       notes
//     });

//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Break started successfully');
//   } catch (err) {
//     console.error('Start break error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    End Break
// // @route   POST /api/attendance/break/end
// // @access  Private
// exports.endBreak = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Get today's attendance
//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     if (!attendance) {
//       return error(res, 'No active attendance found', 400);
//     }

//     // Find active break
//     const activeBreak = attendance.getActiveBreak();
//     if (!activeBreak) {
//       return error(res, 'No active break found', 400);
//     }

//     // End the break
//     activeBreak.endTime = new Date();
//     const durationMs = activeBreak.endTime - activeBreak.startTime;
//     activeBreak.duration = Math.floor(durationMs / (1000 * 60)); // minutes
//     activeBreak.isActive = false;

//     // Update total break minutes
//     attendance.totalBreakMinutes = attendance.breaks.reduce((total, brk) => {
//       return total + (brk.duration || 0);
//     }, 0);

//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Break ended successfully');
//   } catch (err) {
//     console.error('End break error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get Current Status
// // @route   GET /api/attendance/status
// // @access  Private
// exports.getCurrentStatus = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     if (!attendance) {
//       return success(res, {
//         isClockedIn: false,
//         isOnBreak: false,
//         attendance: null
//       }, 'No attendance for today');
//     }

//     const activeBreak = attendance.getActiveBreak();
    
//     return success(res, {
//       isClockedIn: !attendance.logoutTime,
//       isOnBreak: !!activeBreak,
//       activeBreak: activeBreak || null,
//       attendance
//     });
//   } catch (err) {
//     console.error('Get status error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get My Attendance History
// // @route   GET /api/attendance/my-history
// // @access  Private
// exports.getMyAttendance = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { startDate, endDate, page = 1, limit = 10 } = req.query;

//     let query = { user: userId };

//     // Date filter
//     if (startDate || endDate) {
//       query.date = {};
//       if (startDate) query.date.$gte = new Date(startDate);
//       if (endDate) query.date.$lte = new Date(endDate);
//     }

//     const skip = (page - 1) * limit;

//     const [attendances, total] = await Promise.all([
//       Attendance.find(query)
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate('user', 'name email'),
//       Attendance.countDocuments(query)
//     ]);

//     return success(res, {
//       attendances,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         totalPages: Math.ceil(total / limit)
//       }
//     });
//   } catch (err) {
//     console.error('Get my attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get All Attendance (SA & TL only)
// // @route   GET /api/attendance/all
// // @access  Private (SA & TL)
// exports.getAllAttendance = async (req, res) => {
//   try {
//     const { date, userId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

//     let query = {};

//     // Date filter
//     if (date) {
//       const targetDate = new Date(date);
//       targetDate.setHours(0, 0, 0, 0);
//       const nextDate = new Date(targetDate);
//       nextDate.setDate(nextDate.getDate() + 1);
//       query.date = { $gte: targetDate, $lt: nextDate };
//     }

//     if (startDate || endDate) {
//       query.date = {};
//       if (startDate) query.date.$gte = new Date(startDate);
//       if (endDate) query.date.$lte = new Date(endDate);
//     }

//     if (userId) query.user = userId;
//     if (status) query.status = status;

//     const skip = (page - 1) * limit;

//     const [attendances, total] = await Promise.all([
//       Attendance.find(query)
//         .sort({ date: -1, loginTime: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate('user', 'name email globalRole department'),
//       Attendance.countDocuments(query)
//     ]);

//     return success(res, {
//       attendances,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         totalPages: Math.ceil(total / limit)
//       }
//     });
//   } catch (err) {
//     console.error('Get all attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get Today's Attendance Report (SA & TL only)
// // @route   GET /api/attendance/today
// // @access  Private (SA & TL)
// exports.getTodayAttendance = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     const attendances = await Attendance.find({
//       date: { $gte: today, $lt: tomorrow }
//     })
//     .populate('user', 'name email globalRole department')
//     .sort({ loginTime: 1 });

//     // Get all users to show who hasn't clocked in
//     const allUsers = await User.find({ 
//       isActive: true,
//       globalRole: { $ne: ROLES.SUPERADMIN } // Exclude SA from attendance
//     }).select('name email globalRole department');

//     const clockedInUserIds = attendances.map(att => att.user._id.toString());
//     const notClockedIn = allUsers.filter(user => 
//       !clockedInUserIds.includes(user._id.toString())
//     );

//     return success(res, {
//       present: attendances,
//       absent: notClockedIn,
//       stats: {
//         totalUsers: allUsers.length,
//         present: attendances.length,
//         absent: notClockedIn.length,
//         presentPercentage: ((attendances.length / allUsers.length) * 100).toFixed(2)
//       }
//     });
//   } catch (err) {
//     console.error('Get today attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get Attendance Summary
// // @route   GET /api/attendance/summary
// // @access  Private (SA & TL)
// exports.getAttendanceSummary = async (req, res) => {
//   try {
//     const { userId, startDate, endDate } = req.query;

//     const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//     const end = endDate ? new Date(endDate) : new Date();

//     const query = {
//       date: { $gte: start, $lte: end }
//     };

//     if (userId) query.user = userId;

//     const attendances = await Attendance.find(query)
//       .populate('user', 'name email');

//     // Calculate statistics
//     const totalDays = attendances.length;
//     const totalWorkingMinutes = attendances.reduce((sum, att) => sum + (att.netWorkingMinutes || 0), 0);
//     const totalBreakMinutes = attendances.reduce((sum, att) => sum + (att.totalBreakMinutes || 0), 0);
//     const averageWorkingHours = totalDays > 0 ? (totalWorkingMinutes / totalDays / 60).toFixed(2) : 0;
    
//     const presentDays = attendances.filter(att => att.status === ATTENDANCE_STATUS.PRESENT).length;
//     const halfDays = attendances.filter(att => att.status === ATTENDANCE_STATUS.HALF_DAY).length;

//     return success(res, {
//       summary: {
//         totalDays,
//         presentDays,
//         halfDays,
//         totalWorkingHours: (totalWorkingMinutes / 60).toFixed(2),
//         totalBreakHours: (totalBreakMinutes / 60).toFixed(2),
//         averageWorkingHours,
//         attendancePercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0
//       },
//       attendances
//     });
//   } catch (err) {
//     console.error('Get summary error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Manual Adjustment (SA & TL only)
// // @route   PUT /api/attendance/:id/adjust
// // @access  Private (SA & TL)
// exports.adjustAttendance = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { loginTime, logoutTime, adjustmentNotes } = req.body;

//     const attendance = await Attendance.findById(id);
    
//     if (!attendance) {
//       return error(res, 'Attendance record not found', 404);
//     }

//     if (loginTime) attendance.loginTime = new Date(loginTime);
//     if (logoutTime) attendance.logoutTime = new Date(logoutTime);
    
//     attendance.adjustmentNotes = adjustmentNotes;
//     attendance.adjustedBy = req.user._id;
//     attendance.adjustedAt = new Date();

//     attendance.calculateDurations();
//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email')
//       .populate('adjustedBy', 'name email');

//     return success(res, populatedAttendance, 'Attendance adjusted successfully');
//   } catch (err) {
//     console.error('Adjust attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };



















// const Attendance = require('../models/Attendance.model');
// const User = require('../models/User.model');
// const { success, error } = require('../utils/response');
// const { ATTENDANCE_STATUS, BREAK_TYPES, ROLES } = require('../config/constants');

// // @desc    Clock In
// // @route   POST /api/attendance/clock-in
// // @access  Private (All authenticated users)
// exports.clockIn = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { location } = req.body;

//     // Check if already clocked in today
//     const existingAttendance = await Attendance.getTodayAttendance(userId);
    
//     if (existingAttendance) {
//       return error(res, 'Already clocked in today', 400);
//     }

//     // Create new attendance record
//     const attendance = await Attendance.create({
//       user: userId,
//       loginTime: new Date(),
//       date: new Date(),
//       status: ATTENDANCE_STATUS.PRESENT,
//       loginLocation: {
//         ip: req.ip,
//         device: req.headers['user-agent'],
//         ...location
//       }
//     });

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Clocked in successfully', 201);
//   } catch (err) {
//     console.error('Clock in error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Clock Out
// // @route   POST /api/attendance/clock-out
// // @access  Private
// exports.clockOut = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { location } = req.body;

//     // Get today's attendance
//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     if (!attendance) {
//       return error(res, 'No active clock-in found for today', 400);
//     }

//     // CRITICAL: Verify attendance belongs to current user
//     if (attendance.user.toString() !== userId.toString()) {
//       return error(res, 'Unauthorized: This attendance record does not belong to you', 403);
//     }

//     if (attendance.logoutTime) {
//       return error(res, 'Already clocked out today', 400);
//     }

//     // Check if any break is still active
//     const activeBreak = attendance.getActiveBreak();
//     if (activeBreak) {
//       return error(res, 'Please end your current break before clocking out', 400);
//     }

//     // Set logout time and calculate durations
//     attendance.logoutTime = new Date();
//     attendance.isActive = false;
//     attendance.logoutLocation = {
//       ip: req.ip,
//       device: req.headers['user-agent'],
//       ...location
//     };

//     attendance.calculateDurations();

//     // Determine if half-day based on working hours
//     const { HALF_DAY_HOURS } = require('../config/constants').ATTENDANCE_RULES;
//     if (attendance.netWorkingMinutes < HALF_DAY_HOURS * 60) {
//       attendance.status = ATTENDANCE_STATUS.HALF_DAY;
//     }

//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Clocked out successfully');
//   } catch (err) {
//     console.error('Clock out error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Start Break
// // @route   POST /api/attendance/break/start
// // @access  Private
// exports.startBreak = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { breakType = BREAK_TYPES.TEA_BREAK, notes } = req.body;

//     // Get today's attendance
//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     if (!attendance) {
//       return error(res, 'Please clock in first', 400);
//     }

//     // CRITICAL: Verify attendance belongs to current user
//     if (attendance.user.toString() !== userId.toString()) {
//       return error(res, 'Unauthorized: This attendance record does not belong to you', 403);
//     }

//     if (attendance.logoutTime) {
//       return error(res, 'Already clocked out for the day', 400);
//     }

//     // Check if can take break
//     const breakCheck = attendance.canTakeBreak();
//     if (!breakCheck.allowed) {
//       return error(res, breakCheck.reason, 400);
//     }

//     // Add new break
//     attendance.breaks.push({
//       breakType,
//       startTime: new Date(),
//       isActive: true,
//       notes
//     });

//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Break started successfully');
//   } catch (err) {
//     console.error('Start break error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    End Break
// // @route   POST /api/attendance/break/end
// // @access  Private
// exports.endBreak = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Get today's attendance
//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     if (!attendance) {
//       return error(res, 'No active attendance found', 400);
//     }

//     // CRITICAL: Verify attendance belongs to current user
//     if (attendance.user.toString() !== userId.toString()) {
//       return error(res, 'Unauthorized: This attendance record does not belong to you', 403);
//     }

//     // Find active break
//     const activeBreak = attendance.getActiveBreak();
//     if (!activeBreak) {
//       return error(res, 'No active break found', 400);
//     }

//     // End the break
//     activeBreak.endTime = new Date();
//     const durationMs = activeBreak.endTime - activeBreak.startTime;
//     activeBreak.duration = Math.floor(durationMs / (1000 * 60)); // minutes
//     activeBreak.isActive = false;

//     // Update total break minutes
//     attendance.totalBreakMinutes = attendance.breaks.reduce((total, brk) => {
//       return total + (brk.duration || 0);
//     }, 0);

//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email globalRole');

//     return success(res, populatedAttendance, 'Break ended successfully');
//   } catch (err) {
//     console.error('End break error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get Current Status - FIXED TO PREVENT USER MISMATCH
// // @route   GET /api/attendance/status
// // @access  Private
// exports.getCurrentStatus = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     console.log('🔍 [getCurrentStatus] ==================');
//     console.log('🔍 [getCurrentStatus] Request from user:', {
//       id: userId.toString(),
//       name: req.user.name,
//       email: req.user.email,
//       role: req.user.globalRole,
//       timestamp: new Date().toISOString()
//     });

//     // CRITICAL: Get attendance for THIS SPECIFIC USER ONLY
//     const attendance = await Attendance.getTodayAttendance(userId);
    
//     // If no attendance found, return clean state
//     if (!attendance) {
//       console.log('✅ [getCurrentStatus] No attendance record - returning clean state');
//       return success(res, {
//         isClockedIn: false,
//         isOnBreak: false,
//         activeBreak: null,
//         attendance: null
//       }, 'No attendance for today');
//     }

//     // CRITICAL: Triple-check that attendance belongs to current user
//     const attendanceUserId = attendance.user._id || attendance.user;
//     const attendanceUserIdStr = attendanceUserId.toString();
//     const currentUserIdStr = userId.toString();

//     console.log('🔍 [getCurrentStatus] Verification:', {
//       attendanceUserId: attendanceUserIdStr,
//       currentUserId: currentUserIdStr,
//       match: attendanceUserIdStr === currentUserIdStr
//     });

//     if (attendanceUserIdStr !== currentUserIdStr) {
//       console.error('🚨 [getCurrentStatus] CRITICAL: USER MISMATCH!', {
//         requestUserId: currentUserIdStr,
//         attendanceUserId: attendanceUserIdStr,
//         attendanceId: attendance._id
//       });
      
//       // Return empty state - DO NOT LEAK OTHER USER'S DATA
//       return success(res, {
//         isClockedIn: false,
//         isOnBreak: false,
//         activeBreak: null,
//         attendance: null
//       }, 'No attendance for today');
//     }

//     // Get active break safely
//     const activeBreak = attendance.breaks ? attendance.breaks.find(brk => brk.isActive) : null;
    
//     console.log('✅ [getCurrentStatus] Returning valid attendance:', {
//       userId: currentUserIdStr,
//       attendanceId: attendance._id,
//       isClockedIn: !attendance.logoutTime,
//       isOnBreak: !!activeBreak
//     });
    
//     return success(res, {
//       isClockedIn: !attendance.logoutTime,
//       isOnBreak: !!activeBreak,
//       activeBreak: activeBreak || null,
//       attendance
//     });
//   } catch (err) {
//     console.error('❌ [getCurrentStatus] Error:', err);
//     return error(res, err.message || 'Failed to get attendance status', 500);
//   }
// };

// // @desc    Get My Attendance History
// // @route   GET /api/attendance/my-history
// // @access  Private
// exports.getMyAttendance = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { startDate, endDate, page = 1, limit = 10 } = req.query;

//     let query = { user: userId };

//     // Date filter
//     if (startDate || endDate) {
//       query.date = {};
//       if (startDate) query.date.$gte = new Date(startDate);
//       if (endDate) query.date.$lte = new Date(endDate);
//     }

//     const skip = (page - 1) * limit;

//     const [attendances, total] = await Promise.all([
//       Attendance.find(query)
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate('user', 'name email'),
//       Attendance.countDocuments(query)
//     ]);

//     return success(res, {
//       attendances,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         totalPages: Math.ceil(total / limit)
//       }
//     });
//   } catch (err) {
//     console.error('Get my attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get All Attendance (SA & TL only)
// // @route   GET /api/attendance/all
// // @access  Private (SA & TL)
// exports.getAllAttendance = async (req, res) => {
//   try {
//     const { date, userId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

//     let query = {};

//     // Date filter
//     if (date) {
//       const targetDate = new Date(date);
//       targetDate.setHours(0, 0, 0, 0);
//       const nextDate = new Date(targetDate);
//       nextDate.setDate(nextDate.getDate() + 1);
//       query.date = { $gte: targetDate, $lt: nextDate };
//     }

//     if (startDate || endDate) {
//       query.date = {};
//       if (startDate) query.date.$gte = new Date(startDate);
//       if (endDate) query.date.$lte = new Date(endDate);
//     }

//     if (userId) query.user = userId;
//     if (status) query.status = status;

//     const skip = (page - 1) * limit;

//     const [attendances, total] = await Promise.all([
//       Attendance.find(query)
//         .sort({ date: -1, loginTime: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate('user', 'name email globalRole department'),
//       Attendance.countDocuments(query)
//     ]);

//     return success(res, {
//       attendances,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         totalPages: Math.ceil(total / limit)
//       }
//     });
//   } catch (err) {
//     console.error('Get all attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get Today's Attendance Report (SA & TL only)
// // @route   GET /api/attendance/today
// // @access  Private (SA & TL)
// exports.getTodayAttendance = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     const attendances = await Attendance.find({
//       date: { $gte: today, $lt: tomorrow }
//     })
//     .populate('user', 'name email globalRole department')
//     .sort({ loginTime: 1 });

//     // Get all users to show who hasn't clocked in
//     const allUsers = await User.find({ 
//       isActive: true,
//       globalRole: { $ne: ROLES.SUPERADMIN } // Exclude SA from attendance
//     }).select('name email globalRole department');

//     const clockedInUserIds = attendances.map(att => att.user._id.toString());
//     const notClockedIn = allUsers.filter(user => 
//       !clockedInUserIds.includes(user._id.toString())
//     );

//     return success(res, {
//       present: attendances,
//       absent: notClockedIn,
//       stats: {
//         totalUsers: allUsers.length,
//         present: attendances.length,
//         absent: notClockedIn.length,
//         presentPercentage: ((attendances.length / allUsers.length) * 100).toFixed(2)
//       }
//     });
//   } catch (err) {
//     console.error('Get today attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Get Attendance Summary
// // @route   GET /api/attendance/summary
// // @access  Private (SA & TL)
// exports.getAttendanceSummary = async (req, res) => {
//   try {
//     const { userId, startDate, endDate } = req.query;

//     const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//     const end = endDate ? new Date(endDate) : new Date();

//     const query = {
//       date: { $gte: start, $lte: end }
//     };

//     if (userId) query.user = userId;

//     const attendances = await Attendance.find(query)
//       .populate('user', 'name email');

//     // Calculate statistics
//     const totalDays = attendances.length;
//     const totalWorkingMinutes = attendances.reduce((sum, att) => sum + (att.netWorkingMinutes || 0), 0);
//     const totalBreakMinutes = attendances.reduce((sum, att) => sum + (att.totalBreakMinutes || 0), 0);
//     const averageWorkingHours = totalDays > 0 ? (totalWorkingMinutes / totalDays / 60).toFixed(2) : 0;
    
//     const presentDays = attendances.filter(att => att.status === ATTENDANCE_STATUS.PRESENT).length;
//     const halfDays = attendances.filter(att => att.status === ATTENDANCE_STATUS.HALF_DAY).length;

//     return success(res, {
//       summary: {
//         totalDays,
//         presentDays,
//         halfDays,
//         totalWorkingHours: (totalWorkingMinutes / 60).toFixed(2),
//         totalBreakHours: (totalBreakMinutes / 60).toFixed(2),
//         averageWorkingHours,
//         attendancePercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0
//       },
//       attendances
//     });
//   } catch (err) {
//     console.error('Get summary error:', err);
//     return error(res, err.message, 500);
//   }
// };

// // @desc    Manual Adjustment (SA & TL only)
// // @route   PUT /api/attendance/:id/adjust
// // @access  Private (SA & TL)
// exports.adjustAttendance = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { loginTime, logoutTime, adjustmentNotes } = req.body;

//     const attendance = await Attendance.findById(id);
    
//     if (!attendance) {
//       return error(res, 'Attendance record not found', 404);
//     }

//     if (loginTime) attendance.loginTime = new Date(loginTime);
//     if (logoutTime) attendance.logoutTime = new Date(logoutTime);
    
//     attendance.adjustmentNotes = adjustmentNotes;
//     attendance.adjustedBy = req.user._id;
//     attendance.adjustedAt = new Date();

//     attendance.calculateDurations();
//     await attendance.save();

//     const populatedAttendance = await Attendance.findById(attendance._id)
//       .populate('user', 'name email')
//       .populate('adjustedBy', 'name email');

//     return success(res, populatedAttendance, 'Attendance adjusted successfully');
//   } catch (err) {
//     console.error('Adjust attendance error:', err);
//     return error(res, err.message, 500);
//   }
// };

















const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');
const { success, error } = require('../utils/response');
const { ATTENDANCE_STATUS, BREAK_TYPES, ROLES } = require('../config/constants');

// @desc    Clock In
// @route   POST /api/attendance/clock-in
// @access  Private (All authenticated users)
exports.clockIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const { location } = req.body;

    // Check if already clocked in today
    const existingAttendance = await Attendance.getTodayAttendance(userId);
    
    if (existingAttendance) {
      return error(res, 'Already clocked in today', 400);
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      user: userId,
      loginTime: new Date(),
      date: new Date(),
      status: ATTENDANCE_STATUS.PRESENT,
      loginLocation: {
        ip: req.ip,
        device: req.headers['user-agent'],
        ...location
      }
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('user', 'name email globalRole');

    return success(res, populatedAttendance, 'Clocked in successfully', 201);
  } catch (err) {
    console.error('Clock in error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    Clock Out
// @route   POST /api/attendance/clock-out
// @access  Private
exports.clockOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const { location } = req.body;

    // Get today's attendance WITHOUT population first
    const attendance = await Attendance.getTodayAttendance(userId);
    
    if (!attendance) {
      return error(res, 'No active clock-in found for today', 400);
    }

    // 🔥 FIX: Get the actual user ID from attendance
    const attendanceUserId = attendance.user._id ? attendance.user._id.toString() : attendance.user.toString();
    const currentUserId = userId.toString();

    console.log('🔍 [Clock Out] User verification:', {
      attendanceUserId,
      currentUserId,
      match: attendanceUserId === currentUserId
    });

    if (attendanceUserId !== currentUserId) {
      return error(res, 'Unauthorized: This attendance record does not belong to you', 403);
    }

    if (attendance.logoutTime) {
      return error(res, 'Already clocked out today', 400);
    }

    // Check if any break is still active
    const activeBreak = attendance.getActiveBreak();
    if (activeBreak) {
      return error(res, 'Please end your current break before clocking out', 400);
    }

    // Set logout time and calculate durations
    attendance.logoutTime = new Date();
    attendance.isActive = false;
    attendance.logoutLocation = {
      ip: req.ip,
      device: req.headers['user-agent'],
      ...location
    };

    attendance.calculateDurations();

    // Determine if half-day based on working hours
    const { HALF_DAY_HOURS } = require('../config/constants').ATTENDANCE_RULES;
    if (attendance.netWorkingMinutes < HALF_DAY_HOURS * 60) {
      attendance.status = ATTENDANCE_STATUS.HALF_DAY;
    }

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('user', 'name email globalRole');

    return success(res, populatedAttendance, 'Clocked out successfully');
  } catch (err) {
    console.error('Clock out error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    Start Break - FIXED
// @route   POST /api/attendance/break/start
// @access  Private
exports.startBreak = async (req, res) => {
  try {
    const userId = req.user._id;
    const { breakType = BREAK_TYPES.TEA_BREAK, notes } = req.body;

    console.log('🔍 [Start Break] Request from user:', userId.toString());

    // Get today's attendance WITHOUT population first
    const attendance = await Attendance.getTodayAttendance(userId);
    
    if (!attendance) {
      return error(res, 'Please clock in first', 400);
    }

    // 🔥 FIX: Get the actual user ID from attendance properly
    const attendanceUserId = attendance.user._id ? attendance.user._id.toString() : attendance.user.toString();
    const currentUserId = userId.toString();

    console.log('🔍 [Start Break] User verification:', {
      attendanceUserId,
      currentUserId,
      match: attendanceUserId === currentUserId,
      attendanceUserType: typeof attendance.user,
      attendanceUserValue: attendance.user
    });

    if (attendanceUserId !== currentUserId) {
      console.error('❌ [Start Break] User mismatch!');
      return error(res, 'Unauthorized: This attendance record does not belong to you', 403);
    }

    if (attendance.logoutTime) {
      return error(res, 'Already clocked out for the day', 400);
    }

    // Check if can take break
    const breakCheck = attendance.canTakeBreak();
    if (!breakCheck.allowed) {
      return error(res, breakCheck.reason, 400);
    }

    // Add new break
    attendance.breaks.push({
      breakType,
      startTime: new Date(),
      isActive: true,
      notes
    });

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('user', 'name email globalRole');

    console.log('✅ [Start Break] Break started successfully');
    return success(res, populatedAttendance, 'Break started successfully');
  } catch (err) {
    console.error('❌ [Start Break] Error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    End Break - FIXED
// @route   POST /api/attendance/break/end
// @access  Private
exports.endBreak = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('🔍 [End Break] Request from user:', userId.toString());

    // Get today's attendance WITHOUT population first
    const attendance = await Attendance.getTodayAttendance(userId);
    
    if (!attendance) {
      return error(res, 'No active attendance found', 400);
    }

    // 🔥 FIX: Get the actual user ID from attendance properly
    const attendanceUserId = attendance.user._id ? attendance.user._id.toString() : attendance.user.toString();
    const currentUserId = userId.toString();

    console.log('🔍 [End Break] User verification:', {
      attendanceUserId,
      currentUserId,
      match: attendanceUserId === currentUserId
    });

    if (attendanceUserId !== currentUserId) {
      console.error('❌ [End Break] User mismatch!');
      return error(res, 'Unauthorized: This attendance record does not belong to you', 403);
    }

    // Find active break
    const activeBreak = attendance.getActiveBreak();
    if (!activeBreak) {
      return error(res, 'No active break found', 400);
    }

    // End the break
    activeBreak.endTime = new Date();
    const durationMs = activeBreak.endTime - activeBreak.startTime;
    activeBreak.duration = Math.floor(durationMs / (1000 * 60)); // minutes
    activeBreak.isActive = false;

    // Update total break minutes
    attendance.totalBreakMinutes = attendance.breaks.reduce((total, brk) => {
      return total + (brk.duration || 0);
    }, 0);

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('user', 'name email globalRole');

    console.log('✅ [End Break] Break ended successfully');
    return success(res, populatedAttendance, 'Break ended successfully');
  } catch (err) {
    console.error('❌ [End Break] Error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    Get Current Status - FIXED
// @route   GET /api/attendance/status
// @access  Private
exports.getCurrentStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('🔍 [getCurrentStatus] Request from:', userId.toString());

    // 🔥 CRITICAL: Get attendance for THIS SPECIFIC USER ONLY
    const attendance = await Attendance.getTodayAttendance(userId);
    
    // If no attendance found, return clean state
    if (!attendance) {
      console.log('✅ [getCurrentStatus] No attendance - clean state');
      return success(res, {
        isClockedIn: false,
        isOnBreak: false,
        activeBreak: null,
        attendance: null
      }, 'No attendance for today');
    }

    // 🔥 FIX: Get the actual user ID from attendance properly
    const attendanceUserId = attendance.user._id ? attendance.user._id.toString() : attendance.user.toString();
    const currentUserId = userId.toString();

    console.log('🔍 [getCurrentStatus] Verification:', {
      attendanceUserId,
      currentUserId,
      match: attendanceUserId === currentUserId
    });

    if (attendanceUserId !== currentUserId) {
      console.error('🚨 [getCurrentStatus] USER MISMATCH!');
      
      // Return empty state - DO NOT LEAK OTHER USER'S DATA
      return success(res, {
        isClockedIn: false,
        isOnBreak: false,
        activeBreak: null,
        attendance: null
      }, 'No attendance for today');
    }

    // Get active break safely
    const activeBreak = attendance.breaks ? attendance.breaks.find(brk => brk.isActive) : null;
    
    console.log('✅ [getCurrentStatus] Valid attendance found');
    
    return success(res, {
      isClockedIn: !attendance.logoutTime,
      isOnBreak: !!activeBreak,
      activeBreak: activeBreak || null,
      attendance
    });
  } catch (err) {
    console.error('❌ [getCurrentStatus] Error:', err);
    return error(res, err.message || 'Failed to get attendance status', 500);
  }
};

// @desc    Get My Attendance History
// @route   GET /api/attendance/my-history
// @access  Private
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    let query = { user: userId };

    // Date filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email'),
      Attendance.countDocuments(query)
    ]);

    return success(res, {
      attendances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get my attendance error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    Get All Attendance (SA & TL only)
// @route   GET /api/attendance/all
// @access  Private (SA & TL)
exports.getAllAttendance = async (req, res) => {
  try {
    const { date, userId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    let query = {};

    // Date filter
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDate };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (userId) query.user = userId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, loginTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email globalRole department'),
      Attendance.countDocuments(query)
    ]);

    return success(res, {
      attendances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get all attendance error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    Get Today's Attendance Report (SA & TL only)
// @route   GET /api/attendance/today
// @access  Private (SA & TL)
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    })
    .populate('user', 'name email globalRole department')
    .sort({ loginTime: 1 });

    // Get all users to show who hasn't clocked in
    const allUsers = await User.find({ 
      isActive: true,
      globalRole: { $ne: ROLES.SUPERADMIN } // Exclude SA from attendance
    }).select('name email globalRole department');

    const clockedInUserIds = attendances.map(att => att.user._id.toString());
    const notClockedIn = allUsers.filter(user => 
      !clockedInUserIds.includes(user._id.toString())
    );

    return success(res, {
      present: attendances,
      absent: notClockedIn,
      stats: {
        totalUsers: allUsers.length,
        present: attendances.length,
        absent: notClockedIn.length,
        presentPercentage: ((attendances.length / allUsers.length) * 100).toFixed(2)
      }
    });
  } catch (err) {
    console.error('Get today attendance error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    Get Attendance Summary
// @route   GET /api/attendance/summary
// @access  Private (SA & TL)
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const query = {
      date: { $gte: start, $lte: end }
    };

    if (userId) query.user = userId;

    const attendances = await Attendance.find(query)
      .populate('user', 'name email');

    // Calculate statistics
    const totalDays = attendances.length;
    const totalWorkingMinutes = attendances.reduce((sum, att) => sum + (att.netWorkingMinutes || 0), 0);
    const totalBreakMinutes = attendances.reduce((sum, att) => sum + (att.totalBreakMinutes || 0), 0);
    const averageWorkingHours = totalDays > 0 ? (totalWorkingMinutes / totalDays / 60).toFixed(2) : 0;
    
    const presentDays = attendances.filter(att => att.status === ATTENDANCE_STATUS.PRESENT).length;
    const halfDays = attendances.filter(att => att.status === ATTENDANCE_STATUS.HALF_DAY).length;

    return success(res, {
      summary: {
        totalDays,
        presentDays,
        halfDays,
        totalWorkingHours: (totalWorkingMinutes / 60).toFixed(2),
        totalBreakHours: (totalBreakMinutes / 60).toFixed(2),
        averageWorkingHours,
        attendancePercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0
      },
      attendances
    });
  } catch (err) {
    console.error('Get summary error:', err);
    return error(res, err.message, 500);
  }
};

// @desc    Manual Adjustment (SA & TL only)
// @route   PUT /api/attendance/:id/adjust
// @access  Private (SA & TL)
exports.adjustAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { loginTime, logoutTime, adjustmentNotes } = req.body;

    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return error(res, 'Attendance record not found', 404);
    }

    if (loginTime) attendance.loginTime = new Date(loginTime);
    if (logoutTime) attendance.logoutTime = new Date(logoutTime);
    
    attendance.adjustmentNotes = adjustmentNotes;
    attendance.adjustedBy = req.user._id;
    attendance.adjustedAt = new Date();

    attendance.calculateDurations();
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('user', 'name email')
      .populate('adjustedBy', 'name email');

    return success(res, populatedAttendance, 'Attendance adjusted successfully');
  } catch (err) {
    console.error('Adjust attendance error:', err);
    return error(res, err.message, 500);
  }
};