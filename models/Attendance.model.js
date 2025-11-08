const mongoose = require('mongoose');
const { ATTENDANCE_STATUS, BREAK_TYPES, ATTENDANCE_RULES } = require('../config/constants');

const breakSchema = new mongoose.Schema({
  breakType: {
    type: String,
    enum: Object.values(BREAK_TYPES),
    default: BREAK_TYPES.TEA_BREAK
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  duration: {
    type: Number, // in minutes
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
});

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // IMPORTANT for query performance
  },
  date: {
    type: Date,
    required: true,
    index: true // IMPORTANT for query performance
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: Date,
  breaks: [breakSchema],
  totalBreakMinutes: {
    type: Number,
    default: 0
  },
  grossWorkingMinutes: {
    type: Number,
    default: 0
  },
  netWorkingMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: Object.values(ATTENDANCE_STATUS),
    default: ATTENDANCE_STATUS.PRESENT
  },
  isActive: {
    type: Boolean,
    default: true
  },
  loginLocation: {
    ip: String,
    device: String,
    browser: String
  },
  logoutLocation: {
    ip: String,
    device: String,
    browser: String
  },
  adjustmentNotes: String,
  adjustedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adjustedAt: Date
}, {
  timestamps: true
});

// Compound index for efficient queries - CRITICAL!
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// ==================== INSTANCE METHODS ====================

/**
 * Get active break
 */
attendanceSchema.methods.getActiveBreak = function() {
  return this.breaks.find(brk => brk.isActive);
};

/**
 * Check if user can take break
 */
attendanceSchema.methods.canTakeBreak = function() {
  const { MAX_BREAKS_PER_DAY, MAX_TOTAL_BREAK_MINUTES } = ATTENDANCE_RULES;

  // Check if already on break
  if (this.getActiveBreak()) {
    return { allowed: false, reason: 'Already on a break' };
  }

  // Check max breaks
  if (this.breaks.length >= MAX_BREAKS_PER_DAY) {
    return { allowed: false, reason: `Maximum ${MAX_BREAKS_PER_DAY} breaks allowed per day` };
  }

  // Check total break time
  if (this.totalBreakMinutes >= MAX_TOTAL_BREAK_MINUTES) {
    return { allowed: false, reason: `Maximum ${MAX_TOTAL_BREAK_MINUTES} minutes of break allowed per day` };
  }

  return { allowed: true };
};

/**
 * Calculate durations
 */
attendanceSchema.methods.calculateDurations = function() {
  if (!this.logoutTime) {
    return;
  }

  // Gross working time (total time logged in)
  const grossMs = this.logoutTime - this.loginTime;
  this.grossWorkingMinutes = Math.floor(grossMs / (1000 * 60));

  // Calculate total break time
  this.totalBreakMinutes = this.breaks.reduce((total, brk) => {
    return total + (brk.duration || 0);
  }, 0);

  // Net working time (gross - breaks)
  this.netWorkingMinutes = this.grossWorkingMinutes - this.totalBreakMinutes;
};

// ==================== STATIC METHODS (CRITICAL!) ====================

/**
 * Get today's attendance for a specific user - FIXED VERSION
 * CRITICAL: This ensures only the current user's attendance is returned
 */
attendanceSchema.statics.getTodayAttendance = async function(userId) {
  // Validate userId
  if (!userId) {
    console.error('❌ [getTodayAttendance] userId is required');
    return null;
  }

  // Convert to ObjectId if string
  const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log('📅 [getTodayAttendance] Query params:', {
    userId: userObjectId.toString(),
    dateRange: { from: today.toISOString(), to: tomorrow.toISOString() }
  });
  
  // CRITICAL FIX: Use exact match with ObjectId
  const attendance = await this.findOne({
    user: userObjectId, // Exact user match
    date: { $gte: today, $lt: tomorrow }
  })
  .populate('user', 'name email globalRole');
  
  if (attendance) {
    console.log('✅ [getTodayAttendance] Found attendance:', {
      id: attendance._id.toString(),
      userId: attendance.user._id.toString(),
      userName: attendance.user.name,
      loginTime: attendance.loginTime,
      hasLogout: !!attendance.logoutTime
    });

    // DOUBLE CHECK: Verify user match
    if (attendance.user._id.toString() !== userObjectId.toString()) {
      console.error('🚨 [getTodayAttendance] USER MISMATCH DETECTED!', {
        expected: userObjectId.toString(),
        received: attendance.user._id.toString()
      });
      return null;
    }
  } else {
    console.log('ℹ️ [getTodayAttendance] No attendance found for user:', userObjectId.toString());
  }
  
  return attendance;
};

/**
 * Get attendance by date range
 */
attendanceSchema.statics.getAttendanceByRange = async function(userId, startDate, endDate) {
  return await this.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  })
  .sort({ date: -1 })
  .populate('user', 'name email globalRole');
};

/**
 * Get all active attendances (currently working)
 */
attendanceSchema.statics.getActiveAttendances = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await this.find({
    date: { $gte: today, $lt: tomorrow },
    logoutTime: null,
    isActive: true
  }).populate('user', 'name email globalRole department');
};

/**
 * Check if user is currently clocked in
 */
attendanceSchema.statics.isUserClockedIn = async function(userId) {
  const attendance = await this.getTodayAttendance(userId);
  return attendance && !attendance.logoutTime;
};

/**
 * Get monthly attendance summary
 */
attendanceSchema.statics.getMonthlySummary = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return await this.getAttendanceByRange(userId, startDate, endDate);
};

// ==================== MIDDLEWARE ====================

// Pre-save: Set date to start of day
attendanceSchema.pre('save', function(next) {
  if (this.isNew) {
    const date = new Date(this.loginTime);
    date.setHours(0, 0, 0, 0);
    this.date = date;
  }
  next();
});

// Pre-save: Calculate durations if logoutTime is set
attendanceSchema.pre('save', function(next) {
  if (this.logoutTime && this.isModified('logoutTime')) {
    this.calculateDurations();
  }
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;