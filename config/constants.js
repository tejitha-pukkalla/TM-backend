module.exports = {
  // User Roles
  ROLES: {
    SUPERADMIN: 'superadmin',
    TEAMLEAD: 'teamlead',
    PROJECTLEAD: 'projectlead',
    MEMBER: 'member'
  },

  // Project Statuses
  PROJECT_STATUS: {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    ON_HOLD: 'on-hold'
  },

  // Project Approval Status
  APPROVAL_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  // Task Approval Status
  TASK_APPROVAL_STATUS: {
    PENDING: 'pending', // Team Lead assigned, waiting for Superadmin
    PENDING_TEAMLEAD: 'pending_teamlead', // Project Lead assigned, waiting for Team Lead
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  // Task Status
  TASK_STATUS: {
    NOT_STARTED: 'not-started',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    BACK_TO_PROJECTLEAD: 'back_to_projectlead'
  },

  // Task Priority
  PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  },

  // Project Roles
  PROJECT_ROLES: {
    TEAMLEAD: 'teamlead',
    PROJECTLEAD: 'projectlead',
    MEMBER: 'member'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    TASK_ASSIGNED: 'task_assigned',
    TASK_APPROVED: 'task_approved',
    TASK_REJECTED: 'task_rejected',
    TASK_COMPLETED: 'task_completed',
    PROJECT_CREATED: 'project_created',
    USER_CREATED: 'user_created',
    TASK_REASSIGNED: 'task_reassigned',
    DUE_DATE_APPROACHING: 'due_date_approaching',
    TASK_OVERDUE: 'task_overdue'
  },

  // Time Entry Types
  TIME_ENTRY_TYPES: {
    AUTOMATIC: 'automatic',
    MANUAL: 'manual'
  },

  // Task Update Types
  UPDATE_TYPES: {
    PROGRESS: 'progress',
    ISSUE: 'issue',
    COMMENT: 'comment',
    FILE: 'file',
    COMPLETION: 'completion'
  
  
  },

  
  // Attendance Status
  ATTENDANCE_STATUS: {
    PRESENT: 'present',
    ABSENT: 'absent',
    HALF_DAY: 'half-day',
    ON_LEAVE: 'on-leave',
    HOLIDAY: 'holiday',
    WEEKEND: 'weekend'
  },

  // Break Types
  BREAK_TYPES: {
    TEA_BREAK: 'tea-break',
    LUNCH_BREAK: 'lunch-break',
    SHORT_BREAK: 'short-break',
    PERSONAL: 'personal'
  },

  // Work Session Status
  WORK_SESSION_STATUS: {
    ACTIVE: 'active',
    ON_BREAK: 'on-break',
    COMPLETED: 'completed'
  },

  // Attendance Business Rules
  ATTENDANCE_RULES: {
    MAX_BREAKS_PER_DAY: 4,
    MAX_BREAK_DURATION_MINUTES: 15,
    MAX_TOTAL_BREAK_MINUTES: 60,
    STANDARD_WORK_HOURS: 8,
    HALF_DAY_HOURS: 4,
    LATE_ARRIVAL_MINUTES: 30, // 9:00 AM + 30 min = 9:30 AM
    EARLY_DEPARTURE_MINUTES: 30 // 6:00 PM - 30 min = 5:30 PM
  }
};
