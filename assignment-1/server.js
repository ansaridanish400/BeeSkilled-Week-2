require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health / root
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'To-Do List API is running',
    version: '1.0.0',
    endpoints: {
      'GET /api/tasks': 'Get all tasks (filters: completed, priority, search, sort, page, limit)',
      'GET /api/tasks/:id': 'Get single task',
      'POST /api/tasks': 'Create task { title*, description, completed, priority, dueDate }',
      'PUT /api/tasks/:id': 'Update task (also PATCH supported)',
      'DELETE /api/tasks/:id': 'Delete task',
      'PATCH /api/tasks/:id/toggle': 'Toggle completed status',
      'DELETE /api/tasks/completed/clear': 'Delete all completed tasks',
      'GET /health': 'Health check',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', uptime: process.uptime() });
});

// API routes
app.use('/api/tasks', taskRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

// Only start listening if run directly (allows testing import)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
