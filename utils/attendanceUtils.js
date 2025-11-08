const { ATTENDANCE_RULES } = require('../config/constants');

/**
 * Format minutes to HH:MM:SS
 */
exports.formatMinutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Calculate time difference in minutes
 */
exports.getTimeDifferenceInMinutes = (startTime, endTime) => {
  const diff = new Date(endTime) - new Date(startTime);
  return Math.floor(diff / (1000 * 60));
};

/**
 * Check if time is late (after 9:30 AM)
 */
exports.isLateArrival = (loginTime) => {
  const login = new Date(loginTime);
  const standardTime = new Date(login);
  standardTime.setHours(9, 30, 0, 0); // 9:30 AM
  
  return login > standardTime;
};

/**
 * Check if early departure (before 5:30 PM)
 */
exports.isEarlyDeparture = (logoutTime) => {
  const logout = new Date(logoutTime);
  const standardTime = new Date(logout);
  standardTime.setHours(17, 30, 0, 0); // 5:30 PM
  
  return logout < standardTime;
};

/**
 * Get working status message
 */
exports.getWorkingStatus = (attendance) => {
  if (!attendance) {
    return 'Not clocked in';
  }
  
  if (attendance.logoutTime) {
    return 'Clocked out';
  }
  
  const activeBreak = attendance.breaks.find(brk => brk.isActive);
  if (activeBreak) {
    return `On ${activeBreak.breakType}`;
  }
  
  return 'Working';
};

/**
 * Calculate attendance statistics for a period
 */
exports.calculateAttendanceStats = (attendances) => {
  const totalDays = attendances.length;
  
  if (totalDays === 0) {
    return {
      totalDays: 0,
      totalWorkingHours: 0,
      totalBreakHours: 0,
      averageWorkingHours: 0,
      averageBreakMinutes: 0,
      lateArrivals: 0,
      earlyDepartures: 0
    };
  }
  
  let totalWorkingMinutes = 0;
  let totalBreakMinutes = 0;
  let lateArrivals = 0;
  let earlyDepartures = 0;
  
  attendances.forEach(att => {
    totalWorkingMinutes += att.netWorkingMinutes || 0;
    totalBreakMinutes += att.totalBreakMinutes || 0;
    
    if (this.isLateArrival(att.loginTime)) {
      lateArrivals++;
    }
    
    if (att.logoutTime && this.isEarlyDeparture(att.logoutTime)) {
      earlyDepartures++;
    }
  });
  
  return {
    totalDays,
    totalWorkingHours: (totalWorkingMinutes / 60).toFixed(2),
    totalBreakHours: (totalBreakMinutes / 60).toFixed(2),
    averageWorkingHours: (totalWorkingMinutes / totalDays / 60).toFixed(2),
    averageBreakMinutes: (totalBreakMinutes / totalDays).toFixed(2),
    lateArrivals,
    earlyDepartures,
    punctualityScore: (((totalDays - lateArrivals - earlyDepartures) / totalDays) * 100).toFixed(2)
  };
};

/**
 * Get date range for reports
 */
exports.getDateRange = (period) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  let startDate = new Date();
  
  switch(period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }
  
  return { startDate, endDate };
};

/**
 * Format attendance for export
 */
exports.formatAttendanceForExport = (attendances) => {
  return attendances.map(att => ({
    Date: att.date.toLocaleDateString(),
    Name: att.user.name,
    Email: att.user.email,
    'Login Time': att.loginTime.toLocaleTimeString(),
    'Logout Time': att.logoutTime ? att.logoutTime.toLocaleTimeString() : 'Not clocked out',
    'Working Hours': (att.netWorkingMinutes / 60).toFixed(2),
    'Break Time (min)': att.totalBreakMinutes,
    'Total Breaks': att.breaks.length,
    Status: att.status,
    'Late Arrival': this.isLateArrival(att.loginTime) ? 'Yes' : 'No'
  }));
};

/**
 * Validate break duration
 */
exports.validateBreakDuration = (duration) => {
  const { MAX_BREAK_DURATION_MINUTES } = ATTENDANCE_RULES;
  
  if (duration > MAX_BREAK_DURATION_MINUTES) {
    return {
      valid: false,
      message: `Break duration exceeds maximum allowed time of ${MAX_BREAK_DURATION_MINUTES} minutes`,
      exceededBy: duration - MAX_BREAK_DURATION_MINUTES
    };
  }
  
  return { valid: true };
};

/**
 * Get current working time in real-time
 */
exports.getCurrentWorkingTime = (loginTime, breaks) => {
  if (!loginTime) return 0;
  
  const now = new Date();
  const totalMs = now - new Date(loginTime);
  const totalMinutes = Math.floor(totalMs / (1000 * 60));
  
  // Subtract break time
  const breakMinutes = breaks.reduce((total, brk) => {
    if (brk.endTime) {
      return total + brk.duration;
    } else if (brk.isActive) {
      // Active break - calculate current duration
      const activeBreakMs = now - new Date(brk.startTime);
      return total + Math.floor(activeBreakMs / (1000 * 60));
    }
    return total;
  }, 0);
  
  return totalMinutes - breakMinutes;
};

/**
 * Check if weekend
 */
exports.isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

/**
 * Get attendance color code for UI
 */
exports.getAttendanceColor = (attendance) => {
  if (!attendance) return 'gray';
  
  const hours = attendance.netWorkingMinutes / 60;
  
  if (hours >= 8) return 'green';
  if (hours >= 6) return 'yellow';
  if (hours >= 4) return 'orange';
  return 'red';
};