const mongoose = require('mongoose');
const Note = require('../models/Note');

// @desc    Get all notes for logged-in user (with filtering, search, pagination, sorting)
// @route   GET /api/notes
// @access  Private
// @query   search, tags, isPinned, isArchived, color, sort, page, limit
const getNotes = async (req, res, next) => {
  try {
    const {
      search,
      tags,
      isPinned,
      isArchived,
      color,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { user: req.user.id };

    if (isPinned !== undefined) filter.isPinned = isPinned === 'true';
    if (isArchived !== undefined) filter.isArchived = isArchived === 'true';
    if (color) filter.color = color;
    if (tags) {
      // tags=work,personal  -> match any of those tags
      const tagList = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tagList.length) filter.tags = { $in: tagList };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = {};
    if (sort) {
      // e.g. sort=-updatedAt,title
      sort.split(',').forEach((field) => {
        const key = field.startsWith('-') ? field.slice(1) : field;
        sortOption[key] = field.startsWith('-') ? -1 : 1;
      });
    } else {
      // Pinned first, then most recently updated
      sortOption.isPinned = -1;
      sortOption.updatedAt = -1;
    }

    const perPage = Math.min(100, Math.max(1, parseInt(limit)));
    const currentPage = Math.max(1, parseInt(page));
    const skip = (currentPage - 1) * perPage;

    const [notes, total] = await Promise.all([
      Note.find(filter).sort(sortOption).skip(skip).limit(perPage),
      Note.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: notes.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / perPage),
      data: notes,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single note (only if owned by user)
// @route   GET /api/notes/:id
// @access  Private
const getNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid note ID format' });
    }
    const note = await Note.findOne({ _id: id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.status(200).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Private
const createNote = async (req, res, next) => {
  try {
    const { title, content, tags, isPinned, isArchived, color } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Normalize tags if provided
    let normalizedTags;
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({ success: false, message: 'Tags must be an array of strings' });
      }
      normalizedTags = [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
      if (normalizedTags.length > 10) {
        return res.status(400).json({ success: false, message: 'Cannot have more than 10 tags' });
      }
    }

    const note = await Note.create({
      user: req.user.id,
      title: title.trim(),
      content: content !== undefined ? String(content).trim() : '',
      ...(normalizedTags !== undefined && { tags: normalizedTags }),
      ...(isPinned !== undefined && { isPinned }),
      ...(isArchived !== undefined && { isArchived }),
      ...(color !== undefined && { color }),
    });

    res.status(201).json({ success: true, message: 'Note created', data: note });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
};

// @desc    Update note (full or partial — ownership enforced)
// @route   PUT /api/notes/:id  / PATCH /api/notes/:id
// @access  Private
const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid note ID format' });
    }

    if (req.body.title !== undefined && !String(req.body.title).trim()) {
      return res.status(400).json({ success: false, message: 'Title cannot be empty' });
    }

    // Normalize tags if provided
    if (req.body.tags !== undefined) {
      if (!Array.isArray(req.body.tags)) {
        return res.status(400).json({ success: false, message: 'Tags must be an array of strings' });
      }
      req.body.tags = [...new Set(req.body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
      if (req.body.tags.length > 10) {
        return res.status(400).json({ success: false, message: 'Cannot have more than 10 tags' });
      }
    }

    // Trim title/content if present
    if (req.body.title !== undefined) req.body.title = String(req.body.title).trim();
    if (req.body.content !== undefined) req.body.content = String(req.body.content).trim();

    // Only allow whitelisted fields
    const allowed = ['title', 'content', 'tags', 'isPinned', 'isArchived', 'color'];
    const updateData = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const note = await Note.findOneAndUpdate(
      { _id: id, user: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.status(200).json({ success: true, message: 'Note updated', data: note });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
};

// @desc    Delete note (ownership enforced)
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid note ID format' });
    }
    const note = await Note.findOneAndDelete({ _id: id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.status(200).json({ success: true, message: 'Note deleted', data: note });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle pin status
// @route   PATCH /api/notes/:id/pin
// @access  Private
const togglePin = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid note ID format' });
    }
    const note = await Note.findOne({ _id: id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    note.isPinned = !note.isPinned;
    await note.save();
    res.status(200).json({ success: true, message: `Note ${note.isPinned ? 'pinned' : 'unpinned'}`, data: note });
  } catch (err) {
    next(err);
  }
};

// @desc    Archive / unarchive note
// @route   PATCH /api/notes/:id/archive
// @access  Private
const toggleArchive = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid note ID format' });
    }
    const note = await Note.findOne({ _id: id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    note.isArchived = !note.isArchived;
    await note.save();
    res.status(200).json({ success: true, message: `Note ${note.isArchived ? 'archived' : 'unarchived'}`, data: note });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  toggleArchive,
};
