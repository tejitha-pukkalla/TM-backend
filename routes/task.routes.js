const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const taskController = require('../controllers/task.controller');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const { validate } = require('../middlewares/validate');
const { uploadTask } = require('../config/cloudinary');
const { ROLES } = require('../config/constants');

// Validation
const taskValidation = [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('assignedTo').notEmpty().withMessage('Assignee is required'),
  body('estimatedTime').isNumeric().withMessage('Estimated time must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  validate
];

const updateValidation = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('updateType').isIn(['progress', 'issue', 'comment', 'file', 'completion']).withMessage('Invalid update type'),
  validate
];

const subtaskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  validate
];

const reassignValidation = [
  body('newAssignee').notEmpty().withMessage('New assignee is required'),
  body('reason').optional().trim(),
  validate
];

// NEW ROUTES - My Tasks (for member, projectlead, teamlead)
router.get('/my-tasks', protect, taskController.getMyTasks);
router.get('/assigned-by-me', protect, taskController.getAssignedTasks);

// Task CRUD
router.post('/', protect, uploadTask.array('attachments', 5), taskValidation, taskController.createTask);
router.get('/', protect, taskController.getAllTasks);
router.get('/:id', protect, taskController.getTask);
router.put('/:id', protect, taskController.updateTask);

// Task actions
router.post('/:id/start', protect, taskController.startTask);
router.post('/:id/complete', protect, taskController.completeTask);
router.post('/:id/reassign', protect, reassignValidation, taskController.reassignTask);

// Task updates
router.post('/:id/updates', protect, uploadTask.array('attachments', 3), updateValidation, taskController.addTaskUpdate);

// Subtasks
router.post('/:id/subtasks', protect, subtaskValidation, taskController.addSubtask);
router.patch('/:id/subtasks/:subtaskId', protect, taskController.toggleSubtask);

module.exports = router;