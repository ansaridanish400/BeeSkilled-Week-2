const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  clearCompleted,
} = require('../controllers/taskController');

const router = express.Router();

// Order matters: specific routes before param routes
router.route('/').get(getTasks).post(createTask);

// Bulk operation
router.delete('/completed/clear', clearCompleted);

// Toggle
router.patch('/:id/toggle', toggleTask);

// Single resource CRUD — PUT for full update, PATCH also supported for partial
router.route('/:id').get(getTask).put(updateTask).patch(updateTask).delete(deleteTask);

module.exports = router;
