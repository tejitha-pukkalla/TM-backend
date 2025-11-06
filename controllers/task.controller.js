const Task = require('../models/Task.model');
const TaskUpdate = require('../models/TaskUpdate.model');
const TaskSubtask = require('../models/TaskSubtask.model');
const TaskTimeLog = require('../models/TaskTimeLog.model');
const Project = require('../models/Project.model');
const ProjectMember = require('../models/ProjectMember.model');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const { success, error, paginated } = require('../utils/response');
const { TASK_APPROVAL_STATUS, TASK_STATUS, ROLES } = require('../config/constants');

// @desc    Create/Assign new task
// @route   POST /api/tasks
// @access  Private (Team Lead/Project Lead)

exports.createTask = async (req, res, next) => {
  try {
    const {
      projectId,
      title,
      description,
      assignedTo,
      estimatedTime,
      dueDate,
      priority,
      tags,
      attachments
    } = req.body;

    const assignedBy = req.user._id;
    const assignerRole = req.user.globalRole;

    // Check if project exists
    const projectExists = await Project.findById(projectId);
    if (!projectExists) {
      return error(res, 'Project not found', 404);
    }

    // Check if assignee is a member of the project
    const assigneeMember = await ProjectMember.findOne({
      projectId,
      userId: assignedTo,
      isActive: true
    });

    if (!assigneeMember) {
      return error(res, 'Assignee is not a member of this project', 400);
    }

    // Determine approval status based on who is assigning
    let approvalStatus;
    let notificationMessage;
    let canAssignTask = false;

    // Check Superadmin first (highest priority)
    if (assignerRole === ROLES.SUPERADMIN) {
      canAssignTask = true;
      approvalStatus = TASK_APPROVAL_STATUS.PENDING;
      notificationMessage = 'You can start working on this task. Waiting for Superadmin approval.';
    } else {
      // For non-superadmin, check project membership
      const assignerMember = await ProjectMember.findOne({
        projectId,
        userId: assignedBy,
        isActive: true
      });

      if (!assignerMember) {
        return error(res, 'You are not a member of this project', 403);
      }

      // Check Team Lead role (global or project-level)
      if (assignerRole === ROLES.TEAMLEAD || assignerMember.roleInProject === 'teamlead') {
        canAssignTask = true;
        approvalStatus = TASK_APPROVAL_STATUS.PENDING;
        notificationMessage = 'You can start working on this task. Waiting for Superadmin approval.';
      } 
      // Check Project Lead role
      else if (assignerMember.roleInProject === 'projectlead') {
        canAssignTask = true;
        approvalStatus = TASK_APPROVAL_STATUS.PENDING_TEAMLEAD;
        notificationMessage = 'Task assigned. Waiting for Team Lead approval to start.';
      }
    }

    // Final permission check
    if (!canAssignTask) {
      return error(res, 'You do not have permission to assign tasks', 403);
    }

    // Create task
    const task = await Task.create({
      projectId,
      title,
      description,
      assignedTo,
      assignedBy,
      estimatedTime,
      dueDate,
      priority,
      tags,
      attachments: attachments || [],
      approvalStatus,
      status: TASK_STATUS.NOT_STARTED
    });

    // Create notification for assigned member
    await Notification.create({
      userId: assignedTo,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: notificationMessage,
      referenceId: task._id,
      referenceType: 'task'
    });

    // If Team Lead or Superadmin assigned, notify other Superadmins
    if (approvalStatus === TASK_APPROVAL_STATUS.PENDING) {
      const superadmins = await User.find({ 
        globalRole: ROLES.SUPERADMIN,
        _id: { $ne: assignedBy } // Exclude the assigner if they are superadmin
      });
      
      if (superadmins.length > 0) {
        const superadminNotifications = superadmins.map(admin => ({
          userId: admin._id,
          type: 'task_assigned',
          title: 'Task Pending Approval',
          message: `Task "${title}" assigned by ${req.user.name} needs your approval`,
          referenceId: task._id,
          referenceType: 'task'
        }));
        await Notification.insertMany(superadminNotifications);
      }
    }

    // If Project Lead assigned, notify Team Leads
    if (approvalStatus === TASK_APPROVAL_STATUS.PENDING_TEAMLEAD) {
      const teamLeads = await ProjectMember.find({
        projectId,
        roleInProject: 'teamlead',
        isActive: true
      });
      
      if (teamLeads.length > 0) {
        const teamLeadNotifications = teamLeads.map(tl => ({
          userId: tl.userId,
          type: 'task_assigned',
          title: 'Task Approval Needed',
          message: `Task "${title}" assigned by ${req.user.name} needs your approval`,
          referenceId: task._id,
          referenceType: 'task'
        }));
        await Notification.insertMany(teamLeadNotifications);
      }
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('projectId', 'title');

    return success(res, { task: populatedTask }, 'Task created successfully', 201);
  } catch (err) {
    console.error('Create task error:', err);
    next(err);
  }
};

// @desc    Get all tasks (with filters)
// @route   GET /api/tasks
// @access  Private
exports.getAllTasks = async (req, res, next) => {
  try {
    const {
      projectId,
      assignedTo,
      assignedBy,
      status,
      approvalStatus,
      priority,
      page = 1,
      limit = 10
    } = req.query;

    const userId = req.user._id;
    const userRole = req.user.globalRole;

    // Build filter
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (priority) filter.priority = priority;

    // Role-based filtering
    if (userRole === ROLES.MEMBER) {
      // Members see only their tasks
      filter.assignedTo = userId;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (assignedBy) {
      filter.assignedBy = assignedBy;
    }

    // Get tasks with pagination
    const skip = (page - 1) * limit;
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email profilePic')
      .populate('assignedBy', 'name email')
      .populate('projectId', 'title')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(filter);

    return paginated(res, tasks, page, limit, total, 'Tasks retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Get single task with details
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email profilePic department')
      .populate('assignedBy', 'name email')
      .populate('projectId', 'title description')
      .populate('approvedBy', 'name email')
      .populate('reassignedBy', 'name email');

    if (!task) {
      return error(res, 'Task not found', 404);
    }

    // Get task updates
    const updates = await TaskUpdate.find({ taskId: task._id })
      .populate('userId', 'name email profilePic')
      .sort({ createdAt: -1 });

    // Get subtasks
    const subtasks = await TaskSubtask.find({ taskId: task._id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });

    // Get time logs
    const timeLogs = await TaskTimeLog.find({ taskId: task._id })
      .populate('userId', 'name email')
      .sort({ startTime: -1 });

    // Calculate total time spent
    const totalTimeSpent = timeLogs.reduce((acc, log) => acc + log.duration, 0);

    return success(res, {
      task,
      updates,
      subtasks,
      timeLogs,
      totalTimeSpent
    }, 'Task details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Start working on task
// @route   POST /api/tasks/:id/start
// @access  Private (Member)
exports.startTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return error(res, 'Task not found', 404);
    }

    // Check if user is assigned to this task
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return error(res, 'You are not assigned to this task', 403);
    }

    // Check if already started
    if (task.status === TASK_STATUS.IN_PROGRESS) {
      return error(res, 'Task is already in progress', 400);
    }

    // For Project Lead assigned tasks, check if approved by Team Lead
    if (task.approvalStatus === TASK_APPROVAL_STATUS.PENDING_TEAMLEAD) {
      return error(res, 'Task is waiting for Team Lead approval', 403);
    }

    // Update task status
    task.status = TASK_STATUS.IN_PROGRESS;
    task.startedAt = new Date();
    await task.save();

    // Create time log entry
    await TaskTimeLog.create({
      taskId: task._id,
      userId: req.user._id,
      startTime: new Date(),
      entryType: 'automatic'
    });

    // Create task update
    await TaskUpdate.create({
      taskId: task._id,
      userId: req.user._id,
      updateType: 'progress',
      description: 'Started working on task'
    });

    // Notify assigner
    await Notification.create({
      userId: task.assignedBy,
      type: 'task_assigned',
      title: 'Task Started',
      message: `${req.user.name} started working on "${task.title}"`,
      referenceId: task._id,
      referenceType: 'task'
    });

    return success(res, { task }, 'Task started successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Add task update/progress
// @route   POST /api/tasks/:id/updates
// @access  Private (Member)
exports.addTaskUpdate = async (req, res, next) => {
  try {
    const { description, updateType, attachments } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    // Create update
    const update = await TaskUpdate.create({
      taskId: task._id,
      userId: req.user._id,
      updateType,
      description,
      attachments: attachments || []
    });

    const populatedUpdate = await TaskUpdate.findById(update._id)
      .populate('userId', 'name email profilePic');

    // Notify assigner
    await Notification.create({
      userId: task.assignedBy,
      type: 'task_assigned',
      title: 'Task Update',
      message: `${req.user.name} added an update to "${task.title}"`,
      referenceId: task._id,
      referenceType: 'task'
    });

    return success(res, { update: populatedUpdate }, 'Update added successfully', 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Add subtask
// @route   POST /api/tasks/:id/subtasks
// @access  Private (Member)
exports.addSubtask = async (req, res, next) => {
  try {
    const { title } = req.body;

    const subtask = await TaskSubtask.create({
      taskId: req.params.id,
      title,
      createdBy: req.user._id
    });

    const populatedSubtask = await TaskSubtask.findById(subtask._id)
      .populate('createdBy', 'name email');

    return success(res, { subtask: populatedSubtask }, 'Subtask added successfully', 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle subtask completion
// @route   PATCH /api/tasks/:id/subtasks/:subtaskId
// @access  Private (Member)
exports.toggleSubtask = async (req, res, next) => {
  try {
    const subtask = await TaskSubtask.findById(req.params.subtaskId);

    if (!subtask) {
      return error(res, 'Subtask not found', 404);
    }

    subtask.isCompleted = !subtask.isCompleted;
    subtask.completedAt = subtask.isCompleted ? new Date() : null;
    await subtask.save();

    return success(res, { subtask }, 'Subtask updated successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Mark task as completed
// @route   POST /api/tasks/:id/complete
// @access  Private (Member)
exports.completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return error(res, 'Task not found', 404);
    }

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return error(res, 'You are not assigned to this task', 403);
    }

    // End any running time logs
    const runningLog = await TaskTimeLog.findOne({
      taskId: task._id,
      userId: req.user._id,
      endTime: null
    });

    if (runningLog) {
      runningLog.endTime = new Date();
      runningLog.duration = Math.floor((runningLog.endTime - runningLog.startTime) / 60000);
      await runningLog.save();
    }

    // Calculate total actual time
    const timeLogs = await TaskTimeLog.find({ taskId: task._id });
    const totalTime = timeLogs.reduce((acc, log) => acc + log.duration, 0);

    // Update task
    task.status = TASK_STATUS.COMPLETED;
    task.completedAt = new Date();
    task.actualTime = totalTime;
    await task.save();

    // Create completion update
    await TaskUpdate.create({
      taskId: task._id,
      userId: req.user._id,
      updateType: 'completion',
      description: 'Task completed'
    });

    // Notify assigner
    await Notification.create({
      userId: task.assignedBy,
      type: 'task_completed',
      title: 'Task Completed',
      message: `${req.user.name} completed "${task.title}"`,
      referenceId: task._id,
      referenceType: 'task'
    });

    return success(res, { task }, 'Task marked as completed');
  } catch (err) {
    next(err);
  }
};

// @desc    Reassign task
// @route   POST /api/tasks/:id/reassign
// @access  Private (Superadmin/Team Lead/Project Lead)
exports.reassignTask = async (req, res, next) => {
  try {
    const { newAssignee, reason } = req.body;

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    const oldAssignee = task.assignedTo;

    // Update task
    task.assignedTo = newAssignee;
    task.reassignedBy = req.user._id;
    task.reassignedAt = new Date();
    task.reassignmentReason = reason;
    task.status = TASK_STATUS.NOT_STARTED; // Reset status
    task.startedAt = null;
    await task.save();

    // Notify old assignee
    await Notification.create({
      userId: oldAssignee,
      type: 'task_reassigned',
      title: 'Task Reassigned',
      message: `Task "${task.title}" has been reassigned`,
      referenceId: task._id,
      referenceType: 'task'
    });

    // Notify new assignee
    await Notification.create({
      userId: newAssignee,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `Task "${task.title}" has been assigned to you`,
      referenceId: task._id,
      referenceType: 'task'
    });

    return success(res, { task }, 'Task reassigned successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private (Assigner only)
exports.updateTask = async (req, res, next) => {
  try {
    const { title, description, priority, estimatedTime, dueDate } = req.body;

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    // Only assigner can update
    if (task.assignedBy.toString() !== req.user._id.toString() && 
        req.user.globalRole !== ROLES.SUPERADMIN) {
      return error(res, 'Only task assigner can update this task', 403);
    }

    // Update fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;
    if (estimatedTime) task.estimatedTime = estimatedTime;
    if (dueDate) task.dueDate = dueDate;

    await task.save();

    return success(res, { task }, 'Task updated successfully');
  } catch (err) {
    next(err);
  }
};












// ADD THIS NEW FUNCTION - Get My Tasks (for Member, Project Lead, Team Lead)
exports.getMyTasks = async (req, res, next) => {
  try {
    const {
      status,
      approvalStatus,
      priority,
      page = 1,
      limit = 10
    } = req.query;

    const userId = req.user._id;

    // Build filter - Get tasks assigned TO current user
    const filter = {
      assignedTo: userId
    };

    if (status) filter.status = status;
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (priority) filter.priority = priority;

    // Get tasks with pagination
    const skip = (page - 1) * limit;
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email profilePic')
      .populate('assignedBy', 'name email')
      .populate('projectId', 'title')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(filter);

    // Calculate task statistics
    const taskStats = {
      total: total,
      notStarted: await Task.countDocuments({ assignedTo: userId, status: TASK_STATUS.NOT_STARTED }),
      inProgress: await Task.countDocuments({ assignedTo: userId, status: TASK_STATUS.IN_PROGRESS }),
      completed: await Task.countDocuments({ assignedTo: userId, status: TASK_STATUS.COMPLETED }),
      pendingApproval: await Task.countDocuments({ 
        assignedTo: userId, 
        approvalStatus: { $in: [TASK_APPROVAL_STATUS.PENDING, TASK_APPROVAL_STATUS.PENDING_TEAMLEAD] }
      })
    };

    return res.status(200).json({
      success: true,
      message: 'My tasks retrieved successfully',
      data: tasks,
      stats: taskStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get my tasks error:', err);
    next(err);
  }
};


// ADD THIS NEW FUNCTION - Get tasks assigned BY current user
exports.getAssignedTasks = async (req, res, next) => {
  try {
    const {
      status,
      approvalStatus,
      priority,
      page = 1,
      limit = 10
    } = req.query;

    const userId = req.user._id;

    // Build filter - Get tasks assigned BY current user
    const filter = {
      assignedBy: userId
    };

    if (status) filter.status = status;
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (priority) filter.priority = priority;

    // Get tasks with pagination
    const skip = (page - 1) * limit;
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email profilePic')
      .populate('assignedBy', 'name email')
      .populate('projectId', 'title')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Tasks assigned by you retrieved successfully',
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get assigned tasks error:', err);
    next(err);
  }
};


// EXISTING getAllTasks function - Keep as is, just add comment
// This function is for general task listing with filters
// For "My Tasks" specific view, use getMyTasks() function above


// UPDATE createTask validation - Already correct in your code
// The validation in createTask already checks:
// 1. If assignee is a member of the project (including projectlead, teamlead)
// 2. Permission based on assigner role
// No changes needed here - your existing logic is correct