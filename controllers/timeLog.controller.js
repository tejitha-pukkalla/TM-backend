const TaskTimeLog = require('../models/TaskTimeLog.model');
const Task = require('../models/Task.model');
const { success, error } = require('../utils/response');

// @desc    Get all time logs for logged-in user
// @route   GET /api/time/logs
// @access  Private (Member)
exports.getUserTimeLogs = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { userId: req.user._id };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.startTime.$lte = endDateTime;
      }
    }
    
    const timeLogs = await TaskTimeLog.find(query)
      .populate({
        path: 'taskId',
        select: 'title projectId',
        populate: {
          path: 'projectId',
          select: 'title'
        }
      })
      .sort({ startTime: -1 });
    
    return success(res, timeLogs, 'Time logs fetched successfully');
  } catch (err) {
    console.error('Error fetching user time logs:', err);
    next(err);
  }
};

// @desc    Get time logs for a specific task
// @route   GET /api/time/:id/logs
// @access  Private (Member)
exports.getTaskTimeLogs = async (req, res, next) => {
  try {
    const timeLogs = await TaskTimeLog.find({
      taskId: req.params.id,
      userId: req.user._id
    })
      .populate('userId', 'name email')
      .sort({ startTime: -1 });
    
    return success(res, timeLogs, 'Task time logs fetched successfully');
  } catch (err) {
    console.error('Error fetching task time logs:', err);
    next(err);
  }
};

// @desc    Start time tracking
// @route   POST /api/time/:id/start
// @access  Private (Member)
exports.startTimer = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return error(res, 'Not authorized', 403);
    }

    // Check if there's already a running timer
    const runningTimer = await TaskTimeLog.findOne({
      taskId: req.params.id,
      userId: req.user._id,
      endTime: null
    });

    if (runningTimer) {
      return error(res, 'Timer is already running for this task', 400);
    }

    const timeLog = await TaskTimeLog.create({
      taskId: req.params.id,
      userId: req.user._id,
      startTime: new Date(),
      entryType: 'automatic'
    });

    return success(res, { timeLog }, 'Timer started', 201);
  } catch (err) {
    console.error('Error starting timer:', err);
    next(err);
  }
};

// @desc    Stop time tracking
// @route   POST /api/time/:id/stop
// @access  Private (Member)
exports.stopTimer = async (req, res, next) => {
  try {
    const runningTimer = await TaskTimeLog.findOne({
      taskId: req.params.id,
      userId: req.user._id,
      endTime: null
    });

    if (!runningTimer) {
      return error(res, 'No running timer found', 404);
    }

    runningTimer.endTime = new Date();
    runningTimer.duration = Math.floor((runningTimer.endTime - runningTimer.startTime) / 60000); // minutes
    await runningTimer.save();

    // Update task actual time
    const task = await Task.findById(req.params.id);
    if (task) {
      const totalTime = await TaskTimeLog.aggregate([
        { $match: { taskId: task._id } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]);
      
      task.actualTime = totalTime[0]?.total || 0;
      await task.save();
    }

    return success(res, { timeLog: runningTimer }, 'Timer stopped');
  } catch (err) {
    console.error('Error stopping timer:', err);
    next(err);
  }
};

// @desc    Add manual time entry
// @route   POST /api/time/:id/manual
// @access  Private (Member)
exports.addManualTime = async (req, res, next) => {
  try {
    const { startTime, endTime, description } = req.body;

    // Verify task exists and user is assigned
    const task = await Task.findById(req.params.id);
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return error(res, 'Not authorized to add time to this task', 403);
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end - start) / 60000);

    if (duration <= 0) {
      return error(res, 'Invalid time range', 400);
    }

    const timeLog = await TaskTimeLog.create({
      taskId: req.params.id,
      userId: req.user._id,
      startTime: start,
      endTime: end,
      duration,
      description,
      entryType: 'manual'
    });

    // Update task actual time
    const totalTime = await TaskTimeLog.aggregate([
      { $match: { taskId: task._id } },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);
    
    task.actualTime = totalTime[0]?.total || 0;
    await task.save();

    return success(res, { timeLog }, 'Manual time entry added', 201);
  } catch (err) {
    console.error('Error adding manual time:', err);
    next(err);
  }
};