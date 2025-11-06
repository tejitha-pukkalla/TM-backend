const Project = require('../models/Project.model');
const ProjectMember = require('../models/ProjectMember.model');
const Task = require('../models/Task.model');
const User = require('../models/User.model');
const { success, error } = require('../utils/response');
const { ROLES, TASK_STATUS } = require('../config/constants');

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

