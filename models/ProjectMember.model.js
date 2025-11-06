const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roleInProject: {
    type: String,
    enum: ['teamlead', 'projectlead', 'member'],
    default: 'member'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
projectMemberSchema.index({ projectId: 1, userId: 1 });
projectMemberSchema.index({ userId: 1 });
projectMemberSchema.index({ projectId: 1, isActive: 1 });

// Ensure unique user per project (active members)
projectMemberSchema.index(
  { projectId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

module.exports = mongoose.model('ProjectMember', projectMemberSchema);