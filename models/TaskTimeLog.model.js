const mongoose = require('mongoose');
const { TIME_ENTRY_TYPES } = require('../config/constants');

const taskTimeLogSchema = new mongoose.Schema({
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
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  entryType: {
    type: String,
    enum: Object.values(TIME_ENTRY_TYPES),
    default: TIME_ENTRY_TYPES.AUTOMATIC
  }
}, {
  timestamps: true
});

taskTimeLogSchema.index({ taskId: 1 });
taskTimeLogSchema.index({ userId: 1 });
taskTimeLogSchema.index({ startTime: 1 });

module.exports = mongoose.model('TaskTimeLog', taskTimeLogSchema);
