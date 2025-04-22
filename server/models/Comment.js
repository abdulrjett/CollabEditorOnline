const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lineNumber: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  replies: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
commentSchema.index({ document: 1, lineNumber: 1 });
commentSchema.index({ document: 1, author: 1 });
commentSchema.index({ document: 1, resolved: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 