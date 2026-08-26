const express = require('express');
const {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  toggleArchive,
} = require('../controllers/noteController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All note routes are protected
router.use(protect);

router.route('/').get(getNotes).post(createNote);

// Toggle operations — must be before /:id
router.patch('/:id/pin', togglePin);
router.patch('/:id/archive', toggleArchive);

router.route('/:id').get(getNote).put(updateNote).patch(updateNote).delete(deleteNote);

module.exports = router;
