const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Document = require('../models/Document');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Get all comments for a document
router.get('/document/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Check if user has access to the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (!document.hasAccess(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const comments = await Comment.find({ document: documentId })
      .populate('author', 'name username')
      .populate('replies.author', 'name username')
      .sort({ lineNumber: 1, createdAt: 1 });
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Create a new comment
router.post('/', auth, async (req, res) => {
  try {
    const { documentId, lineNumber, content } = req.body;
    
    if (!documentId || lineNumber === undefined || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user has access to the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (!document.hasAccess(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const comment = new Comment({
      document: documentId,
      author: req.user._id,
      lineNumber,
      content
    });
    
    await comment.save();
    
    // Create notification for document owner if commenter is not the owner
    if (document.owner.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: document.owner,
        sender: req.user._id,
        type: 'COMMENT_ADDED',
        document: documentId,
        message: `${req.user.name} commented on line ${lineNumber + 1} of your document "${document.title}"`
      });
      
      await notification.save();
      
      // Increment unread notification count
      await User.findByIdAndUpdate(document.owner, {
        $inc: { unreadNotifications: 1 }
      });
    }
    
    // Populate author details
    await comment.populate('author', 'name username');
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
});

// Add a reply to a comment
router.post('/:commentId/replies', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Reply content is required' });
    }
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user has access to the document
    const document = await Document.findById(comment.document);
    if (!document.hasAccess(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const reply = {
      author: req.user._id,
      content,
      createdAt: new Date()
    };
    
    comment.replies.push(reply);
    comment.updatedAt = new Date();
    await comment.save();
    
    // Create notification for the original comment author
    if (comment.author.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: comment.author,
        sender: req.user._id,
        type: 'COMMENT_ADDED',
        document: comment.document,
        message: `${req.user.name} replied to your comment on document "${document.title}"`
      });
      
      await notification.save();
      
      // Increment unread notification count
      await User.findByIdAndUpdate(comment.author, {
        $inc: { unreadNotifications: 1 }
      });
    }
    
    // Populate the reply author details
    await comment.populate('replies.author', 'name username');
    
    res.json(comment);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: 'Error adding reply' });
  }
});

// Update a comment
router.put('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, resolved } = req.body;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Only author can edit the comment content
    if (content && comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the author can edit this comment' });
    }
    
    // Update fields if provided
    if (content) comment.content = content;
    if (resolved !== undefined) comment.resolved = resolved;
    
    comment.updatedAt = new Date();
    await comment.save();
    
    // Populate author details
    await comment.populate('author', 'name username');
    await comment.populate('replies.author', 'name username');
    
    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Error updating comment' });
  }
});

// Delete a comment
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Only author or document owner can delete the comment
    const document = await Document.findById(comment.document);
    if (
      comment.author.toString() !== req.user._id.toString() && 
      document.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await Comment.findByIdAndDelete(commentId);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

module.exports = router;
