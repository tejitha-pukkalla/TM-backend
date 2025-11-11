// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const connectDB = require('./config/database');
// const errorHandler = require('./middlewares/errorHandler');

// // Load environment variables FIRST
// dotenv.config();

// // Connect to database
// connectDB();

// // Initialize express app
// const app = express();

// // Middlewares
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Debug middleware - Log all requests
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path}`);
//   next();
// });

// // Import routes AFTER dotenv.config()
// const authRoutes = require('./routes/auth.routes');
// const userRoutes = require('./routes/user.routes');
// const projectRoutes = require('./routes/project.routes');
// const taskRoutes = require('./routes/task.routes');
// const approvalRoutes = require('./routes/approval.routes');
// const dashboardRoutes = require('./routes/dashboard.routes');
// const notificationRoutes = require('./routes/notification.routes');
// const timeLogRoutes = require('./routes/timeLog.routes');
// const attendanceRoutes = require('./routes/attendance.routes'); // NEW

// // Health check - Root
// app.get('/', (req, res) => {
//   res.json({ 
//     success: true, 
//     message: 'Task Manager API is running!',
//     version: '1.0.0',
//     endpoints: {
//       auth: '/api/auth',
//       users: '/api/users',
//       projects: '/api/projects',
//       tasks: '/api/tasks',
//       approvals: '/api/approvals',
//       dashboard: '/api/dashboard',
//       notifications: '/api/notifications',
//       time: '/api/time',
//       attendance: '/api/attendance' // NEW
//     }
//   });
// });

// // API Routes
// console.log('📍 Mounting routes...');
// app.use('/api/auth', authRoutes);
// console.log('✅ Auth routes mounted at /api/auth');

// app.use('/api/users', userRoutes);
// app.use('/api/projects', projectRoutes);
// app.use('/api/tasks', taskRoutes);
// app.use('/api/approvals', approvalRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/time', timeLogRoutes);
// app.use('/api/attendance', attendanceRoutes); // NEW
// console.log('✅ Attendance routes mounted at /api/attendance');

// // 404 handler - MUST BE AFTER ALL ROUTES
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found',
//     requestedPath: req.path,
//     method: req.method
//   });
// });

// // Error handler (should be last)
// app.use(errorHandler);

// // Import and initialize cron jobs
// const { initAttendanceCronJobs } = require('./jobs/attendance.cron');

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`🔗 API Base URL: http://localhost:${PORT}`);
//   console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
//   console.log(`\n📍 Available Routes:`);
//   console.log(`   GET  http://localhost:${PORT}/api/auth/setup-status`);
//   console.log(`   POST http://localhost:${PORT}/api/auth/setup`);
//   console.log(`   POST http://localhost:${PORT}/api/auth/login`);
//   console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
//   console.log(`   POST http://localhost:${PORT}/api/attendance/clock-in`);
//   console.log(`   POST http://localhost:${PORT}/api/attendance/clock-out`);

//   //Initialize attendance cron jobs
//   initAttendanceCronJobs();
// });




const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables FIRST
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware - Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Import routes AFTER dotenv.config()
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const profileRoutes = require('./routes/profile.routes'); // NEW
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const approvalRoutes = require('./routes/approval.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const timeLogRoutes = require('./routes/timeLog.routes');
const attendanceRoutes = require('./routes/attendance.routes');

// Health check - Root
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Task Manager API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      profile: '/api/profile', // NEW
      projects: '/api/projects',
      tasks: '/api/tasks',
      approvals: '/api/approvals',
      dashboard: '/api/dashboard',
      notifications: '/api/notifications',
      time: '/api/time',
      attendance: '/api/attendance'
    }
  });
});

// API Routes
console.log('📍 Mounting routes...');

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes mounted at /api/auth');

app.use('/api/users', userRoutes);
console.log('✅ User routes mounted at /api/users');

app.use('/api/profile', profileRoutes); // NEW
console.log('✅ Profile routes mounted at /api/profile');

app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/time', timeLogRoutes);
app.use('/api/attendance', attendanceRoutes);
console.log('✅ Attendance routes mounted at /api/attendance');

// 404 handler - MUST BE AFTER ALL ROUTES
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.path,
    method: req.method
  });
});

// Error handler (should be last)
app.use(errorHandler);

// Import and initialize cron jobs
const { initAttendanceCronJobs } = require('./jobs/attendance.cron');

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📍 Available Routes:`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/setup-status`);
  console.log(`   POST http://localhost:${PORT}/api/auth/setup`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   GET  http://localhost:${PORT}/api/users`);
  console.log(`   PUT  http://localhost:${PORT}/api/users/:id/reset-password`);
  console.log(`   GET  http://localhost:${PORT}/api/profile`);
  console.log(`   PUT  http://localhost:${PORT}/api/profile`);
  console.log(`   PUT  http://localhost:${PORT}/api/profile/password`);
  console.log(`   POST http://localhost:${PORT}/api/attendance/clock-in`);
  console.log(`   POST http://localhost:${PORT}/api/attendance/clock-out`);

  // Initialize attendance cron jobs
  initAttendanceCronJobs();
  console.log('✅ Cron jobs initialized');
});