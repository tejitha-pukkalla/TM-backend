const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const projectController = require('../controllers/project.controller');
const { protect } = require('../middlewares/auth');
const { isSuperadminOrTeamlead } = require('../middlewares/roleCheck');
const { validate } = require('../middlewares/validate');
const { uploadProject } = require('../config/cloudinary');

// Validation
const projectValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('requirements').trim().notEmpty().withMessage('Requirements are required'),
  validate
];

const addMemberValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('roleInProject').isIn(['teamlead', 'projectlead', 'member']).withMessage('Invalid role'),
  validate
];

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB per file.',
        timestamp: new Date().toISOString()
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
      timestamp: new Date().toISOString()
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Routes
router.post(
  '/', 
  protect, 
  isSuperadminOrTeamlead, 
  (req, res, next) => {
    uploadProject.array('documents', 10)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  projectValidation, 
  projectController.createProject
);

router.get('/', protect, projectController.getAllProjects);
router.get('/:id', protect, projectController.getProject);
router.put('/:id', protect, isSuperadminOrTeamlead, projectController.updateProject);

// Project members routes
router.get('/:id/members', protect, projectController.getProjectMembers);

// NEW ROUTE - Get all assignable members (member + projectlead + teamlead)
router.get('/:id/assignable-members', protect, projectController.getAssignableMembers);

router.post('/:id/members', protect, isSuperadminOrTeamlead, addMemberValidation, projectController.addProjectMember);
router.delete('/:id/members/:userId', protect, isSuperadminOrTeamlead, projectController.removeProjectMember);

module.exports = router;