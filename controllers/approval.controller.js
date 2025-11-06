const Task = require('../models/Task.model');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const { success, error } = require('../utils/response');
const { TASK_APPROVAL_STATUS, TASK_STATUS, ROLES } = require('../config/constants');

// @desc    Get pending approvals for current user
// @route   GET /api/approvals
// @access  Private (Superadmin/Team Lead)
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const userRole = req.user.globalRole;
    let filter = {};

    if (userRole === ROLES.SUPERADMIN) {
      // Superadmin sees tasks assigned by Team Leads
      filter.approvalStatus = TASK_APPROVAL_STATUS.PENDING;
    } else if (userRole === ROLES.TEAMLEAD) {
      // Team Lead sees tasks assigned by Project Leads in their projects
      filter.approvalStatus = TASK_APPROVAL_STATUS.PENDING_TEAMLEAD;
    } else {
      return error(res, 'You do not have permission to view approvals', 403);
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email profilePic')
      .populate('assignedBy', 'name email')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 });

    return success(res, { tasks, count: tasks.length }, 'Pending approvals retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Approve task
// @route   POST /api/approvals/:id/approve
// @access  Private (Superadmin/Team Lead)
exports.approveTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    if (!task) {
      return error(res, 'Task not found', 404);
    }

    const userRole = req.user.globalRole;

    // Superadmin approves Team Lead assigned tasks
    if (userRole === ROLES.SUPERADMIN && task.approvalStatus === TASK_APPROVAL_STATUS.PENDING) {
      task.approvalStatus = TASK_APPROVAL_STATUS.APPROVED;
      task.approvedBy = req.user._id;
      task.approvalDate = new Date();
      await task.save();

      // Notify member
      await Notification.create({
        userId: task.assignedTo._id,
        type: 'task_approved',
        title: 'Task Approved',
        message: `Your task "${task.title}" has been approved by Superadmin`,
        referenceId: task._id,
        referenceType: 'task'
      });

      // Notify Team Lead
      await Notification.create({
        userId: task.assignedBy._id,
        type: 'task_approved',
        title: 'Task Approved',
        message: `Your assigned task "${task.title}" has been approved`,
        referenceId: task._id,
        referenceType: 'task'
      });

      return success(res, { task }, 'Task approved by Superadmin');
    }

    // Team Lead approves Project Lead assigned tasks
    if (userRole === ROLES.TEAMLEAD && task.approvalStatus === TASK_APPROVAL_STATUS.PENDING_TEAMLEAD) {
      task.approvalStatus = TASK_APPROVAL_STATUS.APPROVED;
      task.approvedBy = req.user._id;
      task.approvalDate = new Date();
      await task.save();

      // Notify member - now they can start
      await Notification.create({
        userId: task.assignedTo._id,
        type: 'task_approved',
        title: 'Task Approved - You Can Start!',
        message: `Your task "${task.title}" has been approved by Team Lead. You can now start working.`,
        referenceId: task._id,
        referenceType: 'task'
      });

      // Notify Project Lead
      await Notification.create({
        userId: task.assignedBy._id,
        type: 'task_approved',
        title: 'Task Approved',
        message: `Your assigned task "${task.title}" has been approved by Team Lead`,
        referenceId: task._id,
        referenceType: 'task'
      });

      return success(res, { task }, 'Task approved by Team Lead');
    }

    return error(res, 'You do not have permission to approve this task', 403);
  } catch (err) {
    next(err);
  }
};

// @desc    Reject task
// @route   POST /api/approvals/:id/reject
// @access  Private (Superadmin/Team Lead)
exports.rejectTask = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    if (!task) {
      return error(res, 'Task not found', 404);
    }

    if (!reason) {
      return error(res, 'Please provide a rejection reason', 400);
    }

    const userRole = req.user.globalRole;

    // Superadmin rejects Team Lead assigned task
    if (userRole === ROLES.SUPERADMIN && task.approvalStatus === TASK_APPROVAL_STATUS.PENDING) {
      task.approvalStatus = TASK_APPROVAL_STATUS.REJECTED;
      task.status = TASK_STATUS.CANCELLED;
      task.rejectionReason = reason;
      await task.save();

      // Notify Team Lead
      await Notification.create({
        userId: task.assignedBy._id,
        type: 'task_rejected',
        title: 'Task Rejected',
        message: `Task "${task.title}" was rejected by Superadmin. Reason: ${reason}`,
        referenceId: task._id,
        referenceType: 'task'
      });

      // Notify Member
      await Notification.create({
        userId: task.assignedTo._id,
        type: 'task_rejected',
        title: 'Task Cancelled',
        message: `Task "${task.title}" was cancelled by Superadmin`,
        referenceId: task._id,
        referenceType: 'task'
      });

      return success(res, { task }, 'Task rejected by Superadmin');
    }

    // Team Lead rejects Project Lead assigned task
    if (userRole === ROLES.TEAMLEAD && task.approvalStatus === TASK_APPROVAL_STATUS.PENDING_TEAMLEAD) {
      task.approvalStatus = TASK_APPROVAL_STATUS.REJECTED;
      task.status = TASK_STATUS.BACK_TO_PROJECTLEAD;
      task.rejectionReason = reason;
      await task.save();

      // Notify Project Lead
      await Notification.create({
        userId: task.assignedBy._id,
        type: 'task_rejected',
        title: 'Task Rejected',
        message: `Task "${task.title}" was rejected by Team Lead. Reason: ${reason}`,
        referenceId: task._id,
        referenceType: 'task'
      });

      // Notify Member
      await Notification.create({
        userId: task.assignedTo._id,
        type: 'task_rejected',
        title: 'Task Rejected',
        message: `Task "${task.title}" was rejected by Team Lead`,
        referenceId: task._id,
        referenceType: 'task'
      });

      return success(res, { task }, 'Task rejected by Team Lead');
    }

    return error(res, 'You do not have permission to reject this task', 403);
  } catch (err) {
    next(err);
  }
};
