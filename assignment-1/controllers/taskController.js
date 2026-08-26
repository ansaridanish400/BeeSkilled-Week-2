const mongoose = require('mongoose');
const Task = require('../models/Task');

// @desc    Get all tasks (with filtering)
// @route   GET /api/tasks
// @query   completed, priority, search, sort, page, limit
const getTasks = async (req, res, next) => {
  try {
    const { completed, priority, search, sort, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (completed !== undefined) filter.completed = completed === 'true';
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = {};
    if (sort) {
      // e.g. sort=-createdAt,priority
      sort.split(',').forEach((field) => {
        const key = field.startsWith('-') ? field.slice(1) : field;
        sortOption[key] = field.startsWith('-') ? -1 : 1;
      });
    } else {
      sortOption.createdAt = -1;
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));
    const perPage = Math.min(100, Math.max(1, parseInt(limit)));

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sortOption).skip(skip).limit(perPage),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / perPage),
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format' });
    }
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new task
// @route   POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, description, completed, priority, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      completed,
      priority,
      dueDate,
    });

    res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (err) {
    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
};

// @desc    Update task (full update via PUT)
// @route   PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format' });
    }

    // Validate title if provided
    if (req.body.title !== undefined && !req.body.title.trim()) {
      return res.status(400).json({ success: false, message: 'Title cannot be empty' });
    }

    const task = await Task.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, message: 'Task updated', data: task });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format' });
    }
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({ success: true, message: 'Task deleted', data: task });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle completed
// @route   PATCH /api/tasks/:id/toggle
const toggleTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format' });
    }
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    task.completed = !task.completed;
    await task.save();
    res.status(200).json({ success: true, message: 'Task toggled', data: task });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete all completed tasks
// @route   DELETE /api/tasks/completed/clear  (must be before :id route)
const clearCompleted = async (req, res, next) => {
  try {
    const result = await Task.deleteMany({ completed: true });
    res.status(200).json({ success: true, message: `${result.deletedCount} completed tasks cleared`, deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  clearCompleted,
};
