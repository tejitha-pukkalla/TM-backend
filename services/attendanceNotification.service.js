const Notification = require('../models/Notification.model');
const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');
const { NOTIFICATION_TYPES, ROLES } = require('../config/constants');

/**
 * Send clock-in reminder to users who haven't clocked in
 * Called by cron job at 9:30 AM daily
 */
exports.sendClockInReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active users (exclude SA)
    const allUsers = await User.find({
      isActive: true,
      globalRole: { $ne: ROLES.SUPERADMIN }
    });

    // Get who has clocked in today
    const clockedInToday = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    });

    const clockedInUserIds = clockedInToday.map(att => att.user.toString());

    // Filter users who haven't clocked in
    const notClockedInUsers = allUsers.filter(
      user => !clockedInUserIds.includes(user._id.toString())
    );

    // Send notifications
    const notifications = notClockedInUsers.map(user => ({
      recipient: user._id,
      type: NOTIFICATION_TYPES.ATTENDANCE_REMINDER,
      title: 'Clock-in Reminder',
      message: "Don't forget to clock in for today!",
      priority: 'medium'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`✅ Sent ${notifications.length} clock-in reminders`);
    }

    return { sent: notifications.length };
  } catch (error) {
    console.error('Error sending clock-in reminders:', error);
    throw error;
  }
};

/**
 * Send clock-out reminder to users still clocked in
 * Called by cron job at 6:00 PM daily
 */
exports.sendClockOutReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active attendance records for today without logout
    const activeAttendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      logoutTime: null,
      isActive: true
    }).populate('user', 'name email');

    // Send notifications
    const notifications = activeAttendances.map(att => ({
      recipient: att.user._id,
      type: NOTIFICATION_TYPES.FORGOT_CLOCK_OUT,
      title: 'Clock-out Reminder',
      message: 'Remember to clock out before leaving!',
      priority: 'high'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`✅ Sent ${notifications.length} clock-out reminders`);
    }

    return { sent: notifications.length };
  } catch (error) {
    console.error('Error sending clock-out reminders:', error);
    throw error;
  }
};

/**
 * Send notification when break exceeds limit
 * Called from attendance controller when break > 15 min
 */
exports.notifyBreakExceeded = async (userId, duration) => {
  try {
    await Notification.create({
      recipient: userId,
      type: NOTIFICATION_TYPES.BREAK_EXCEEDED,
      title: 'Break Time Exceeded',
      message: `Your break has exceeded ${duration} minutes. Please resume work.`,
      priority: 'high'
    });

    console.log(`✅ Sent break exceeded notification to user ${userId}`);
  } catch (error) {
    console.error('Error sending break exceeded notification:', error);
    throw error;
  }
};

/**
 * Notify SA/TL about users who forgot to clock out
 * Called by cron job at 10:00 PM daily
 */
exports.notifyAdminsForgotClockOut = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find users still clocked in
    const stillClockedIn = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      logoutTime: null,
      isActive: true
    }).populate('user', 'name email');

    if (stillClockedIn.length === 0) {
      return { sent: 0, users: 0 };
    }

    // Get SA and TL
    const admins = await User.find({
      globalRole: { $in: [ROLES.SUPERADMIN, ROLES.TEAMLEAD] },
      isActive: true
    });

    const userNames = stillClockedIn.map(att => att.user.name).join(', ');

    // Send notifications to admins
    const notifications = admins.map(admin => ({
      recipient: admin._id,
      type: NOTIFICATION_TYPES.FORGOT_CLOCK_OUT,
      title: 'Users Forgot to Clock Out',
      message: `${stillClockedIn.length} user(s) forgot to clock out: ${userNames}`,
      priority: 'high'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`✅ Notified ${notifications.length} admins about forgotten clock-outs`);
    }

    return { sent: notifications.length, users: stillClockedIn.length };
  } catch (error) {
    console.error('Error notifying admins:', error);
    throw error;
  }
};

/**
 * Send weekly attendance summary to users
 * Called by cron job every Monday at 9:00 AM
 */
exports.sendWeeklyAttendanceSummary = async () => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const users = await User.find({
      isActive: true,
      globalRole: { $ne: ROLES.SUPERADMIN }
    });

    const notifications = [];

    for (const user of users) {
      const attendances = await Attendance.getAttendanceByRange(
        user._id,
        startDate,
        endDate
      );

      const totalWorkingMinutes = attendances.reduce(
        (sum, att) => sum + (att.netWorkingMinutes || 0),
        0
      );
      const totalHours = (totalWorkingMinutes / 60).toFixed(2);

      notifications.push({
        recipient: user._id,
        type: NOTIFICATION_TYPES.ATTENDANCE_REMINDER,
        title: 'Weekly Attendance Summary',
        message: `Last week: ${attendances.length} days, ${totalHours} hours worked`,
        priority: 'low'
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`✅ Sent ${notifications.length} weekly summaries`);
    }

    return { sent: notifications.length };
  } catch (error) {
    console.error('Error sending weekly summaries:', error);
    throw error;
  }
};