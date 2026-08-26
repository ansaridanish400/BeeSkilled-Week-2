require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

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
    message: 'Notes App Backend is running',
    version: '1.0.0',
    endpoints: {
      // Public
      'POST /api/auth/register': 'Register user { name*, email*, password* (min 6) }',
      'POST /api/auth/login': 'Login user { email*, password* } -> returns JWT',
      // Private (Bearer token required)
      'GET /api/auth/me': 'Get current user',
      'POST /api/notes': 'Create note { title*, content, tags[], color, isPinned, isArchived }',
      'GET /api/notes': 'List your notes (query: search, tags, isPinned, isArchived, color, sort, page, limit)',
      'GET /api/notes/:id': 'Get single note (owner only)',
      'PUT /api/notes/:id': 'Update note (full)',
      'PATCH /api/notes/:id': 'Update note (partial)',
      'PATCH /api/notes/:id/pin': 'Toggle pin',
      'PATCH /api/notes/:id/archive': 'Toggle archive',
      'DELETE /api/notes/:id': 'Delete note',
      'GET /health': 'Health check',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', uptime: process.uptime() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

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
