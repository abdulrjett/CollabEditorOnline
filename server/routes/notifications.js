const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all notifications for the current user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name username')
      .populate('document', 'title');

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark a notification as read
router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    // Update unread count on user
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { unreadNotifications: -1 }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    // Reset unread count on user
    await User.findByIdAndUpdate(req.user._id, {
      $set: { unreadNotifications: 0 }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

// Create a notification
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, type, documentId, message } = req.body;

    // Ensure required fields are provided
    if (!recipientId || !type || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create notification
    const notification = new Notification({
      recipient: recipientId,
      sender: req.user._id,
      type,
      document: documentId,
      message,
      read: false
    });

    await notification.save();

    // Increment unread notifications count for recipient
    await User.findByIdAndUpdate(recipientId, {
      $inc: { unreadNotifications: 1 }
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification' });
  }
});

module.exports = router; 