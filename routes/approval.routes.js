const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const approvalController = require('../controllers/approval.controller');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const { validate } = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

const rejectValidation = [
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  validate
];

// Get pending approvals
router.get('/', protect, authorize(ROLES.SUPERADMIN, ROLES.TEAMLEAD), approvalController.getPendingApprovals);

// Approve task
router.post('/:id/approve', protect, authorize(ROLES.SUPERADMIN, ROLES.TEAMLEAD), approvalController.approveTask);

// Reject task
router.post('/:id/reject', protect, authorize(ROLES.SUPERADMIN, ROLES.TEAMLEAD), rejectValidation, approvalController.rejectTask);

module.exports = router;