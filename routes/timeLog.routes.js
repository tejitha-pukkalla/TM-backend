// const express = require('express');
// const router = express.Router();
// const { body } = require('express-validator');
// const timeLogController = require('../controllers/timeLog.controller');
// const { protect } = require('../middlewares/auth');
// const { authorize } = require('../middlewares/roleCheck');
// const { validate } = require('../middlewares/validate');
// const { ROLES } = require('../config/constants');

// const manualTimeValidation = [
//   body('startTime').isISO8601().withMessage('Valid start time is required'),
//   body('endTime').isISO8601().withMessage('Valid end time is required'),
//   body('description').optional().trim(),
//   validate
// ];

// // ⭐ ADD THIS ROUTE FIRST (before /:id routes)
// router.get('/logs', protect, authorize(ROLES.MEMBER), timeLogController.getUserTimeLogs);

// // Task-specific time tracking routes
// router.post('/:id/start', protect, authorize(ROLES.MEMBER), timeLogController.startTimer);
// router.post('/:id/stop', protect, authorize(ROLES.MEMBER), timeLogController.stopTimer);
// router.post('/:id/manual', protect, authorize(ROLES.MEMBER), manualTimeValidation, timeLogController.addManualTime);
// router.get('/:id/logs', protect, authorize(ROLES.MEMBER), timeLogController.getTaskTimeLogs);

// module.exports = router;




const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const timeLogController = require('../controllers/timeLog.controller');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const { validate } = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

const manualTimeValidation = [
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('description').optional().trim(),
  validate
];

// ✅ UPDATED - Allow MEMBER, PROJECT LEAD, TEAM LEAD
router.get('/logs', protect, authorize(ROLES.MEMBER, ROLES.PROJECTLEAD, ROLES.TEAMLEAD), timeLogController.getUserTimeLogs);

// Task-specific time tracking routes - Allow all roles
router.post('/:id/start', protect, authorize(ROLES.MEMBER, ROLES.PROJECTLEAD, ROLES.TEAMLEAD), timeLogController.startTimer);
router.post('/:id/stop', protect, authorize(ROLES.MEMBER, ROLES.PROJECTLEAD, ROLES.TEAMLEAD), timeLogController.stopTimer);
router.post('/:id/manual', protect, authorize(ROLES.MEMBER, ROLES.PROJECTLEAD, ROLES.TEAMLEAD), manualTimeValidation, timeLogController.addManualTime);
router.get('/:id/logs', protect, authorize(ROLES.MEMBER, ROLES.PROJECTLEAD, ROLES.TEAMLEAD), timeLogController.getTaskTimeLogs);

module.exports = router;