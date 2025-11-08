const Project = require('../models/Project.model');
const ProjectMember = require('../models/ProjectMember.model');
const Task = require('../models/Task.model');
const User = require('../models/User.model');
const { success, error } = require('../utils/response');
const { ROLES, TASK_STATUS } = require('../config/constants');
const Attendance = require('../models/Attendance.model');
const { ATTENDANCE_STATUS } = require('../config/constants');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.globalRole;

    let stats = {};

    if (userRole === ROLES.SUPERADMIN) {
      // Superadmin Dashboard
      const totalUsers = await User.countDocuments({ isActive: true });
      const usersByRole = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$globalRole', count: { $sum: 1 } } }
      ]);

      const totalProjects = await Project.countDocuments();
      const projectsByStatus = await Project.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const totalTasks = await Task.countDocuments();
      const tasksByStatus = await Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const pendingApprovals = await Task.countDocuments({
        approvalStatus: 'pending'
      });

      stats = {
        users: {
          total: totalUsers,
          byRole: usersByRole
        },
        projects: {
          total: totalProjects,
          byStatus: projectsByStatus
        },
        tasks: {
          total: totalTasks,
          byStatus: tasksByStatus
        },
        pendingApprovals
      };

    } else if (userRole === ROLES.TEAMLEAD) {
      // Team Lead Dashboard
      const myProjects = await ProjectMember.countDocuments({
        userId,
        roleInProject: 'teamlead'
      });

      const tasksAssignedByMe = await Task.countDocuments({
        assignedBy: userId
      });

      const tasksByStatus = await Task.aggregate([
        { $match: { assignedBy: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const pendingApprovals = await Task.countDocuments({
        approvalStatus: 'pending_teamlead'
      });

      stats = {
        myProjects,
        tasksAssignedByMe,
        tasksByStatus,
        pendingApprovals
      };

    } else if (userRole === ROLES.PROJECTLEAD) {
      // Project Lead Dashboard
      const myProjects = await ProjectMember.countDocuments({
        userId,
        roleInProject: 'projectlead'
      });

      const tasksAssignedByMe = await Task.countDocuments({
        assignedBy: userId
      });

      const tasksByStatus = await Task.aggregate([
        { $match: { assignedBy: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const tasksByApproval = await Task.aggregate([
        { $match: { assignedBy: userId } },
        { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
      ]);

      stats = {
        myProjects,
        tasksAssignedByMe,
        tasksByStatus,
        tasksByApproval
      };

    } else if (userRole === ROLES.MEMBER) {
      // Member Dashboard
      const myTasks = await Task.countDocuments({
        assignedTo: userId
      });

      const tasksByStatus = await Task.aggregate([
        { $match: { assignedTo: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const completedTasks = await Task.countDocuments({
        assignedTo: userId,
        status: TASK_STATUS.COMPLETED
      });

      const pendingTasks = await Task.countDocuments({
        assignedTo: userId,
        status: TASK_STATUS.NOT_STARTED
      });

      const inProgressTasks = await Task.countDocuments({
        assignedTo: userId,
        status: TASK_STATUS.IN_PROGRESS
      });

      stats = {
        myTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        tasksByStatus
      };
    }

    return success(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Get recent activities
// @route   GET /api/dashboard/activities
// @access  Private
exports.getRecentActivities = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    return success(res, { activities: notifications }, 'Recent activities retrieved successfully');
  } catch (err) {
    next(err);
  }
};



// /**
//  * Get Attendance Stats for Dashboard
//  * @route GET /api/dashboard/attendance-stats
//  * @access Private (SA & TL)
//  */
// exports.getAttendanceStats = async (req, res) => {
//   try {
//     const { period = 'today' } = req.query;
    
//     let startDate = new Date();
//     const endDate = new Date();
    
//     // Set date range based on period
//     switch(period) {
//       case 'today':
//         startDate.setHours(0, 0, 0, 0);
//         endDate.setHours(23, 59, 59, 999);
//         break;
//       case 'week':
//         startDate.setDate(startDate.getDate() - 7);
//         break;
//       case 'month':
//         startDate.setMonth(startDate.getMonth() - 1);
//         break;
//     }

//     // Get attendance records
//     const attendances = await Attendance.find({
//       date: { $gte: startDate, $lte: endDate }
//     }).populate('user', 'name email globalRole');

//     // Calculate stats
//     const stats = {
//       totalRecords: attendances.length,
//       present: attendances.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length,
//       halfDay: attendances.filter(a => a.status === ATTENDANCE_STATUS.HALF_DAY).length,
//       totalWorkingHours: 0,
//       totalBreakHours: 0,
//       averageWorkingHours: 0,
//       currentlyWorking: 0,
//       onBreak: 0
//     };

//     // Calculate hours
//     attendances.forEach(att => {
//       stats.totalWorkingHours += (att.netWorkingMinutes || 0) / 60;
//       stats.totalBreakHours += (att.totalBreakMinutes || 0) / 60;
      
//       if (att.isActive && !att.logoutTime) {
//         stats.currentlyWorking++;
        
//         const activeBreak = att.breaks.find(b => b.isActive);
//         if (activeBreak) {
//           stats.onBreak++;
//         }
//       }
//     });

//     stats.averageWorkingHours = stats.totalRecords > 0 
//       ? (stats.totalWorkingHours / stats.totalRecords).toFixed(2) 
//       : 0;

//     stats.totalWorkingHours = stats.totalWorkingHours.toFixed(2);
//     stats.totalBreakHours = stats.totalBreakHours.toFixed(2);

//     return success(res, stats, 'Attendance stats retrieved successfully');
//   } catch (err) {
//     console.error('Get attendance stats error:', err);
//     return error(res, err.message, 500);
//   }
// };

// /**
//  * Get Daily Attendance Chart Data
//  * @route GET /api/dashboard/attendance-chart
//  * @access Private (SA & TL)
//  */
// exports.getAttendanceChartData = async (req, res) => {
//   try {
//     const { days = 7 } = req.query;
    
//     const chartData = [];
//     const today = new Date();
    
//     for (let i = days - 1; i >= 0; i--) {
//       const date = new Date(today);
//       date.setDate(date.getDate() - i);
//       date.setHours(0, 0, 0, 0);
      
//       const nextDate = new Date(date);
//       nextDate.setDate(nextDate.getDate() + 1);
      
//       const dayAttendances = await Attendance.find({
//         date: { $gte: date, $lt: nextDate }
//       });
      
//       const totalWorking = dayAttendances.reduce(
//         (sum, att) => sum + (att.netWorkingMinutes || 0) / 60,
//         0
//       );
      
//       chartData.push({
//         date: date.toISOString().split('T')[0],
//         label: date.toLocaleDateString('en-US', { weekday: 'short' }),
//         present: dayAttendances.length,
//         averageHours: dayAttendances.length > 0 
//           ? (totalWorking / dayAttendances.length).toFixed(2) 
//           : 0
//       });
//     }
    
//     return success(res, chartData, 'Chart data retrieved successfully');
//   } catch (err) {
//     console.error('Get chart data error:', err);
//     return error(res, err.message, 500);
//   }
// };

// /**
//  * Get User Attendance Performance
//  * @route GET /api/dashboard/user-performance
//  * @access Private (SA & TL)
//  */
// exports.getUserAttendancePerformance = async (req, res) => {
//   try {
//     const { limit = 10, sortBy = 'hours' } = req.query;
    
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
//     // Aggregate attendance by user
//     const userStats = await Attendance.aggregate([
//       {
//         $match: {
//           date: { $gte: thirtyDaysAgo }
//         }
//       },
//       {
//         $group: {
//           _id: '$user',
//           totalDays: { $sum: 1 },
//           totalWorkingMinutes: { $sum: '$netWorkingMinutes' },
//           totalBreakMinutes: { $sum: '$totalBreakMinutes' },
//           presentDays: {
//             $sum: {
//               $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.PRESENT] }, 1, 0]
//             }
//           }
//         }
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: '_id',
//           foreignField: '_id',
//           as: 'user'
//         }
//       },
//       {
//         $unwind: '$user'
//       },
//       {
//         $project: {
//           user: {
//             name: '$user.name',
//             email: '$user.email',
//             globalRole: '$user.globalRole'
//           },
//           totalDays: 1,
//           totalWorkingHours: { $divide: ['$totalWorkingMinutes', 60] },
//           averageWorkingHours: {
//             $divide: [
//               { $divide: ['$totalWorkingMinutes', 60] },
//               '$totalDays'
//             ]
//           },
//           attendanceRate: {
//             $multiply: [
//               { $divide: ['$presentDays', '$totalDays'] },
//               100
//             ]
//           }
//         }
//       },
//       {
//         $sort: sortBy === 'days' ? { totalDays: -1 } : { totalWorkingHours: -1 }
//       },
//       {
//         $limit: parseInt(limit)
//       }
//     ]);
    
//     return success(res, userStats, 'User performance retrieved successfully');
//   } catch (err) {
//     console.error('Get user performance error:', err);
//     return error(res, err.message, 500);
//   }
// };

// /**
//  * Get Live Attendance Status
//  * @route GET /api/dashboard/live-status
//  * @access Private (SA & TL)
//  */
// exports.getLiveAttendanceStatus = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);
    
//     const liveAttendances = await Attendance.find({
//       date: { $gte: today, $lt: tomorrow },
//       isActive: true
//     })
//     .populate('user', 'name email globalRole department')
//     .sort({ loginTime: 1 });
    
//     const statusData = liveAttendances.map(att => {
//       const activeBreak = att.breaks.find(b => b.isActive);
//       const workingMinutes = att.netWorkingMinutes || 0;
      
//       return {
//         user: att.user,
//         loginTime: att.loginTime,
//         status: activeBreak ? 'on-break' : 'working',
//         breakType: activeBreak ? activeBreak.breakType : null,
//         workingHours: (workingMinutes / 60).toFixed(2),
//         breaksTaken: att.breaks.length,
//         totalBreakMinutes: att.totalBreakMinutes
//       };
//     });
    
//     return success(res, {
//       total: statusData.length,
//       working: statusData.filter(s => s.status === 'working').length,
//       onBreak: statusData.filter(s => s.status === 'on-break').length,
//       users: statusData
//     }, 'Live status retrieved successfully');
//   } catch (err) {
//     console.error('Get live status error:', err);
//     return error(res, err.message, 500);
//   }
// };