const mongoose = require('mongoose');
const { UPDATE_TYPES } = require('../config/constants');

const taskUpdateSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updateType: {
    type: String,
    enum: Object.values(UPDATE_TYPES),
    required: true
  },
  description: {
    type: String,
    required: true
  },
  attachments: [{
    type: String // Cloudinary URLs
  }]
}, {
  timestamps: true
});

taskUpdateSchema.index({ taskId: 1 });
taskUpdateSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TaskUpdate', taskUpdateSchema);
