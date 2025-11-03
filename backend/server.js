const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint BEFORE other routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SmartPass API is running' });
});

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({ 
    message: 'SmartPass API Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: ['POST /api/login', 'GET /api/users'],
      attendance: ['GET /api/attendance', 'POST /api/attendance'],
      messages: ['GET /api/messages/:userId', 'POST /api/messages'],
      wellness: ['GET /api/wellness', 'POST /api/wellness'],
      events: ['GET /api/events', 'POST /api/events'],
      tickets: ['GET /api/tickets', 'POST /api/tickets'],
      courses: ['GET /api/courses'],
      system: ['GET /api/system/logs', 'POST /api/system/logs']
    }
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const messageRoutes = require('./routes/messages');
const wellnessRoutes = require('./routes/wellness');
const eventsRoutes = require('./routes/events');
const ticketsRoutes = require('./routes/tickets');
const coursesRoutes = require('./routes/courses');
const systemRoutes = require('./routes/system');
const signupRoutes = require('./routes/signup');

// Use routes
app.use('/api', signupRoutes);
app.use('/api', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/system', systemRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SmartPass API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/\n`);
});