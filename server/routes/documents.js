const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Document = require('../models/Document');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create new document
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    // Ensure we have a valid user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const document = new Document({
      title,
      content,
      owner: req.user._id  // Use the authenticated user's ID
    });

    await document.save();

    // Add document to user's documents
    await User.findByIdAndUpdate(req.user._id, {
      $push: { documents: document._id }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Error creating document' });
  }
});

// Get all documents for user
router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    }).sort({ lastModified: -1 });
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

// Get single document
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Error fetching document' });
  }
});

// Update document
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, changedLines } = req.body;
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check for line locking conflicts
    if (changedLines && changedLines.length > 0) {
      // For each changed line, check if it's locked by another user
      for (const lineNumber of changedLines) {
        const lock = document.lockedLines.find(lock => 
          lock.lineNumber === lineNumber && 
          lock.lockedBy.toString() !== req.user._id.toString()
        );
        
        if (lock) {
          return res.status(403).json({ 
            message: `Line ${lineNumber + 1} is locked by another user`, 
            lockedLine: lineNumber 
          });
        }
        
        // Track line edit
        document.recordLineEdit(lineNumber, req.user._id);
      }
    }
    
    if (title) document.title = title;
    if (content !== undefined) document.content = content;
    document.lastModified = new Date();

    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Error updating document' });
  }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
});

// Add collaborator
router.post('/:id/collaborators', auth, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only owner can add collaborators
    if (document.owner.toString() !== req.user._id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if user is already a collaborator
    const existingCollaborator = document.collaborators.find(
      c => c.user.toString() === userId
    );

    if (existingCollaborator) {
      return res.status(400).json({ message: 'User is already a collaborator' });
    }

    document.collaborators.push({ user: userId, role });
    await document.save();

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Error adding collaborator', error: error.message });
  }
});

// Lock a line
router.post('/:id/lock', auth, async (req, res) => {
  try {
    const { lineNumber } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access to the document
    if (document.owner.toString() !== req.user._id.toString() && 
        !document.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const success = document.lockLine(lineNumber, req.user._id);
    if (!success) {
      return res.status(400).json({ message: 'Line is already locked' });
    }

    await document.save();
    res.json({ message: 'Line locked successfully' });
  } catch (error) {
    console.error('Error locking line:', error);
    res.status(500).json({ message: 'Error locking line' });
  }
});

// Unlock a line
router.post('/:id/unlock', auth, async (req, res) => {
  try {
    const { lineNumber } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const success = document.unlockLine(lineNumber, req.user._id);
    if (!success) {
      return res.status(400).json({ message: 'Line is not locked by you' });
    }

    await document.save();
    res.json({ message: 'Line unlocked successfully' });
  } catch (error) {
    console.error('Error unlocking line:', error);
    res.status(500).json({ message: 'Error unlocking line' });
  }
});

// Get locked lines
router.get('/:id/locked-lines', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access to the document
    if (document.owner.toString() !== req.user._id.toString() && 
        !document.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(document.lockedLines);
  } catch (error) {
    console.error('Error fetching locked lines:', error);
    res.status(500).json({ message: 'Error fetching locked lines' });
  }
});

// Share a document
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { email, message } = req.body;
    const documentId = req.params.id;
    
    // Find document and verify ownership
    const document = await Document.findOne({
      _id: documentId,
      owner: req.user._id
    }).populate('owner', 'name');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or you do not have permission to share it' });
    }

    // Generate a sharing link if it doesn't exist
    if (!document.shareLink) {
      try {
        // Create a unique sharing token
        const shareToken = jwt.sign(
          { documentId, owner: req.user._id.toString() },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '30d' }
        );
        
        document.shareLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/shared/${shareToken}`;
        await document.save();
      } catch (tokenError) {
        console.error('Error generating share token:', tokenError);
        return res.status(500).json({ message: 'Error generating share link' });
      }
    }

    // If email is not provided, just return the sharing link
    if (!email) {
      return res.status(200).json({
        message: 'Sharing link generated successfully',
        shareLink: document.shareLink
      });
    }

    // If email is provided, try to share with a specific user
    try {
      // Find user by email
      const targetUser = await User.findOne({ email });
      
      if (!targetUser) {
        return res.status(200).json({
          message: 'User not found in system. Please share this link with them:',
          shareLink: document.shareLink,
          emailNotRegistered: true
        });
      }
      
      // Check if user is already a collaborator
      const isCollaborator = document.collaborators.some(
        collab => collab.toString() === targetUser._id.toString()
      );
      
      if (isCollaborator) {
        return res.status(400).json({ message: 'User is already a collaborator on this document' });
      }
      
      // Add user to collaborators
      document.collaborators.push(targetUser._id);
      await document.save();
      
      // Create a notification for the target user
      try {
        const Notification = mongoose.model('Notification');
        const notification = new Notification({
          recipient: targetUser._id,
          sender: req.user._id,
          type: 'DOCUMENT_SHARED',
          document: documentId,
          message: message || `${req.user.name} has shared a document with you: "${document.title}"`,
          read: false
        });
        
        await notification.save();
        
        // Increment unread notifications count
        await User.findByIdAndUpdate(targetUser._id, {
          $inc: { unreadNotifications: 1 }
        });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue execution even if notification fails
      }
      
      return res.status(200).json({
        message: 'Document shared successfully with user',
        shareLink: document.shareLink,
        sharedWith: {
          id: targetUser._id,
          email: targetUser.email,
          name: targetUser.name
        }
      });
    } catch (userLookupError) {
      console.error('Error finding user:', userLookupError);
      return res.status(200).json({
        message: 'Error finding user. Share link has been generated instead:',
        shareLink: document.shareLink,
        emailNotRegistered: true
      });
    }
  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({ message: 'Error sharing document. Please try again.' });
  }
});

// Endpoint to access a shared document using a share token
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { documentId } = decoded;
    
    // Find the document
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error accessing shared document:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sharing link has expired' });
    }
    res.status(500).json({ message: 'Error accessing shared document' });
  }
});

// Get line edits for a document
router.get('/:id/line-edits', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access to the document
    if (document.owner.toString() !== req.user._id.toString() && 
        !document.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const lineEdits = document.lineEdits.map(edit => ({
      lineNumber: edit.lineNumber,
      editedBy: edit.editedBy,
      editedAt: edit.editedAt,
      isOwner: document.owner.toString() === edit.editedBy.toString()
    }));

    res.json(lineEdits);
  } catch (error) {
    console.error('Error fetching line edits:', error);
    res.status(500).json({ message: 'Error fetching line edits' });
  }
});

// Get all versions for a document
router.get('/:id/versions', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    }).populate('versions.author', 'name email');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(document.versions);
  } catch (error) {
    console.error('Error fetching document versions:', error);
    res.status(500).json({ message: 'Error fetching document versions' });
  }
});

// Get specific version of a document
router.get('/:id/versions/:versionNumber', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    }).populate('versions.author', 'name email');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const version = document.versions.find(v => v.versionNumber === parseInt(req.params.versionNumber));
    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }
    
    res.json(version);
  } catch (error) {
    console.error('Error fetching document version:', error);
    res.status(500).json({ message: 'Error fetching document version' });
  }
});

// Create a new version
router.post('/:id/versions', auth, async (req, res) => {
  try {
    const { content, diff, description } = req.body;
    
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    document.addVersion(content, req.user._id, diff, description);
    await document.save();
    
    res.json({ 
      message: 'Version created successfully', 
      version: document.version,
      document 
    });
  } catch (error) {
    console.error('Error creating document version:', error);
    res.status(500).json({ message: 'Error creating document version' });
  }
});

// Restore document to a specific version
router.post('/:id/versions/:versionNumber/restore', auth, async (req, res) => {
  try {
    const versionNumber = parseInt(req.params.versionNumber);
    
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const success = document.restoreVersion(versionNumber);
    if (!success) {
      return res.status(404).json({ message: 'Version not found' });
    }
    
    // Save the document after restoration
    await document.save();
    
    res.json({ 
      message: 'Document restored to version ' + versionNumber,
      document
    });
  } catch (error) {
    console.error('Error restoring document version:', error);
    res.status(500).json({ message: 'Error restoring document version' });
  }
});

module.exports = router; 