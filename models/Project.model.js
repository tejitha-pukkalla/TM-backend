const mongoose = require('mongoose');
const { PROJECT_STATUS, APPROVAL_STATUS } = require('../config/constants');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Project description is required']
  },
  requirements: {
    type: String,
    required: [true, 'Project requirements are required']
  },
  documents: [{
    type: String // Cloudinary URLs
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalStatus: {
    type: String,
    enum: Object.values(APPROVAL_STATUS),
    default: APPROVAL_STATUS.APPROVED // Auto-approved as per requirement
  },
  status: {
    type: String,
    enum: Object.values(PROJECT_STATUS),
    default: PROJECT_STATUS.ACTIVE
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
projectSchema.index({ createdBy: 1 });
projectSchema.index({ approvalStatus: 1 });
projectSchema.index({ status: 1 });

module.exports = mongoose.model('Project', projectSchema);
