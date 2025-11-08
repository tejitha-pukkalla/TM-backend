const cron = require('node-cron');
const {
  sendClockInReminders,
  sendClockOutReminders,
  notifyAdminsForgotClockOut,
  sendWeeklyAttendanceSummary
} = require('../services/attendanceNotification.service');

// Initialize all attendance cron jobs
const initAttendanceCronJobs = () => {
  console.log('🕐 Initializing Attendance Cron Jobs...');

  // ===== 1. CLOCK-IN REMINDER =====
  // Runs every day at 9:30 AM
  // Cron format: "30 9 * * *" (minute hour day month weekday)
  cron.schedule('30 9 * * *', async () => {
    console.log('⏰ Running Clock-In Reminder Job at', new Date().toLocaleString());
    try {
      const result = await sendClockInReminders();
      console.log(`✅ Sent ${result.sent} clock-in reminders`);
    } catch (error) {
      console.error('❌ Clock-in reminder job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // IST timezone
  });

  // ===== 2. CLOCK-OUT REMINDER =====
  // Runs every day at 6:00 PM
  cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Running Clock-Out Reminder Job at', new Date().toLocaleString());
    try {
      const result = await sendClockOutReminders();
      console.log(`✅ Sent ${result.sent} clock-out reminders`);
    } catch (error) {
      console.error('❌ Clock-out reminder job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // ===== 3. FORGOT CLOCK-OUT NOTIFICATION TO ADMINS =====
  // Runs every day at 10:00 PM
  cron.schedule('0 22 * * *', async () => {
    console.log('⏰ Running Forgot Clock-Out Admin Notification at', new Date().toLocaleString());
    try {
      const result = await notifyAdminsForgotClockOut();
      console.log(`✅ Notified admins about ${result.users} users who forgot to clock out`);
    } catch (error) {
      console.error('❌ Admin notification job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // ===== 4. WEEKLY ATTENDANCE SUMMARY =====
  // Runs every Monday at 9:00 AM
  // "0 9 * * 1" - minute hour day month weekday (1 = Monday)
  cron.schedule('0 9 * * 1', async () => {
    console.log('⏰ Running Weekly Attendance Summary Job at', new Date().toLocaleString());
    try {
      const result = await sendWeeklyAttendanceSummary();
      console.log(`✅ Sent ${result.sent} weekly attendance summaries`);
    } catch (error) {
      console.error('❌ Weekly summary job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // ===== TEST JOB (Optional - Remove in production) =====
  // Runs every 5 minutes for testing
  // Uncomment this for testing during development
  /*
  cron.schedule('*\/5 * * * *', async () => {
    console.log('🧪 TEST: Running every 5 minutes at', new Date().toLocaleString());
    try {
      // Test your notification functions here
      console.log('✅ Test job completed');
    } catch (error) {
      console.error('❌ Test job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  */

  console.log('✅ Attendance Cron Jobs Initialized Successfully!');
  console.log('\n📋 Scheduled Jobs:');
  console.log('  • Clock-In Reminder      : Every day at 9:30 AM');
  console.log('  • Clock-Out Reminder     : Every day at 6:00 PM');
  console.log('  • Admin Forgot Notification : Every day at 10:00 PM');
  console.log('  • Weekly Summary         : Every Monday at 9:00 AM\n');
};

module.exports = { initAttendanceCronJobs };

/* 
===========================================
CRON EXPRESSION REFERENCE
===========================================

Format: "minute hour day month weekday"

Examples:
- "0 9 * * *"     → Every day at 9:00 AM
- "30 9 * * *"    → Every day at 9:30 AM
- "0 18 * * *"    → Every day at 6:00 PM
- "0 22 * * *"    → Every day at 10:00 PM
- "0 9 * * 1"     → Every Monday at 9:00 AM
- "0 0 * * *"     → Every day at midnight
- "*\/5 * * * *"  → Every 5 minutes
- "0 *\/2 * * *"  → Every 2 hours
- "0 9-17 * * *"  → Every hour from 9 AM to 5 PM

Timezone: 'Asia/Kolkata' (IST)
===========================================
*/