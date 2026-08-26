const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 10;
        },
        message: 'Cannot have more than 10 tags',
      },
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      enum: ['default', 'yellow', 'green', 'blue', 'pink', 'purple'],
      default: 'default',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for user's notes queries
noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ user: 1, isPinned: -1, updatedAt: -1 });
noteSchema.index({ user: 1, title: 'text', content: 'text' });

// Normalize tags: trim, lowercase, deduplicate
noteSchema.pre('save', function (next) {
  if (this.isModified('tags') && Array.isArray(this.tags)) {
    this.tags = [...new Set(this.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }
  next();
});

module.exports = mongoose.model('Note', noteSchema);
