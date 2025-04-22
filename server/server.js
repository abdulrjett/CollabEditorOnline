const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const versionUtils = require('./utils/versionUtils');

// Load environment variables
dotenv.config();

// Set default values for development
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not found in environment, using default for development');
  process.env.JWT_SECRET = 'default_jwt_secret_for_development';
}

// Import models and routes
const Document = require('./models/Document');
const Comment = require('./models/Comment');
const User = require('./models/User');
const Analysis = require('./models/Analysis');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const notificationRoutes = require('./routes/notifications');
const commentRoutes = require('./routes/comments');
const nlpRoutes = require('./routes/nlp');
const analysisRoutes = require('./routes/analysis');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.warn('Authentication token missing for socket connection');
      // Allow connection without authentication, but mark as unauthenticated
      socket.userId = null;
      socket.userName = 'Anonymous';
      socket.isAuthenticated = false;
      return next();
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.isAuthenticated = true;
      
      // Get user info for better collaboration
      try {
        const user = await User.findById(decoded.userId).select('name username');
        if (user) {
          socket.userName = user.name;
          socket.userUsername = user.username;
        } else {
          socket.userName = 'Unknown User';
        }
      } catch (userError) {
        console.error('Error fetching user info for socket:', userError);
        socket.userName = 'Unknown User';
      }
      
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      socket.userId = null;
      socket.userName = 'Anonymous';
      socket.isAuthenticated = false;
      next();
    }
  } catch (error) {
    console.error('Socket authentication error:', error);
    socket.userId = null;
    socket.userName = 'Anonymous';
    socket.isAuthenticated = false;
    next();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', auth, documentRoutes);
app.use('/api/notifications', auth, notificationRoutes);
app.use('/api/comments', auth, commentRoutes);
app.use('/api/nlp', nlpRoutes);
app.use('/api/analysis', analysisRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}, User: ${socket.userId}, Name: ${socket.userName || 'Unknown'}`);
  
  // Track active documents per socket for cleanup on disconnect
  const activeDocuments = new Set();

  socket.on('join-document', async (documentId) => {
    socket.join(documentId);
    activeDocuments.add(documentId);
    console.log(`Client ${socket.id} joined document: ${documentId}`);
    
    // Notify others that a user has joined
    socket.to(documentId).emit('user-joined', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
    
    // Send current document state (optional, for extra robustness)
    try {
      const document = await Document.findById(documentId);
      if (document) {
        // Send locked lines information to the joining user
        socket.emit('document-state', {
          lockedLines: document.lockedLines,
          lineEdits: document.lineEdits
        });
      }
    } catch (error) {
      console.error('Error fetching document state on join:', error);
    }
  });

  socket.on('leave-document', (documentId) => {
    socket.leave(documentId);
    activeDocuments.delete(documentId);
    console.log(`Client ${socket.id} left document: ${documentId}`);
    
    // Notify others that a user has left
    socket.to(documentId).emit('user-left', {
      userId: socket.userId,
      userName: socket.userName
    });
  });

  // Handle document changes with line tracking
  socket.on('document-change', async (data) => {
    try {
      const { documentId, content, changedLines, cursorPosition, previousContent } = data;
      
      // Skip database updates if user is not authenticated
      if (!socket.isAuthenticated || !socket.userId) {
        // Still emit to other clients in the room, just don't update database
        socket.to(documentId).emit('document-update', {
          content,
          changedLines,
          cursorPosition,
          userId: 'anonymous',
          userName: socket.userName || 'Anonymous'
        });
        return;
      }
      
      // Emit to all other clients in the room
      socket.to(documentId).emit('document-update', {
        content,
        changedLines,
        cursorPosition,
        userId: socket.userId,
        userName: socket.userName
      });
      
      // If we have changed lines, record them in the database
      if (changedLines && changedLines.length > 0) {
        const document = await Document.findById(documentId);
        if (document) {
          // Convert changedLines to array if it's not already
          const linesToUpdate = Array.isArray(changedLines) ? changedLines : [changedLines];
          
          // We need to ensure the user ID is valid for recording edits
          if (socket.userId && socket.isAuthenticated) {
            linesToUpdate.forEach(lineNumber => {
              try {
                document.recordLineEdit(lineNumber, socket.userId);
              } catch (lineEditError) {
                console.error('Error recording line edit:', lineEditError);
              }
            });
            
            // If we have the previous content, generate a diff
            if (previousContent) {
              // Create a diff between the old and new content
              const diff = versionUtils.createDiff(previousContent, content);
              
              // Generate a summary for display
              const diffSummary = versionUtils.getDiffSummary(diff);
              
              // Emit the diff to clients for real-time collaboration
              socket.to(documentId).emit('content-diff', {
                diff,
                summary: diffSummary,
                userId: socket.userId,
                userName: socket.userName
              });
            }
            
            try {
              // Update document content
              document.content = content;
              await document.save();
              
              // Broadcast line edits to all clients
              io.to(documentId).emit('line-edits-updated', {
                documentId,
                lineEdits: document.lineEdits
              });
            } catch (saveError) {
              console.error('Error saving document with line edits:', saveError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling document change:', error);
    }
  });
  
  // Handle cursor position updates for collaborative editing
  socket.on('cursor-position', (data) => {
    const { documentId, position, selection } = data;
    // Broadcast cursor position to other users
    socket.to(documentId).emit('cursor-position', {
      position,
      selection,
      userId: socket.userId,
      userName: socket.userName || 'Anonymous'
    });
  });

  // Handle automatic line locking
  socket.on('auto-lock-line', async (data) => {
    try {
      const { documentId, lineNumber } = data;
      
      // Skip database updates if user is not authenticated
      if (!socket.isAuthenticated || !socket.userId) {
        // Don't send the error to the client to avoid notification spam
        console.warn(`Auto-lock attempt without authentication: ${socket.id}`);
        return;
      }
      
      // Validate document ID
      if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
        console.warn(`Invalid document ID for auto-lock: ${documentId}`);
        return;
      }
      
      const document = await Document.findById(documentId);
      if (!document) {
        console.warn(`Document not found for auto-lock: ${documentId}`);
        return;
      }
      
      // Check if user has access to the document
      if (!document.hasAccess(socket.userId)) {
        console.warn(`User ${socket.userId} attempted to auto-lock without access to document ${documentId}`);
        return;
      }
      
      // Check if line is already locked
      const existingLock = document.lockedLines.find(lock => lock.lineNumber === lineNumber);
      if (existingLock) {
        // If locked by someone else, notify the user
        if (existingLock.lockedBy.toString() !== socket.userId) {
          socket.emit('line-locked-error', {
            lineNumber,
            message: 'This line is already locked by another user'
          });
        }
        return;
      }
      
      try {
        // Lock the line
        const success = document.lockLine(lineNumber, socket.userId);
        if (success) {
          await document.save();
          
          // Broadcast to all clients
          io.to(documentId).emit('line-locked', {
            documentId,
            lock: {
              lineNumber,
              lockedBy: socket.userId,
              lockedAt: new Date()
            }
          });
        }
      } catch (lockError) {
        console.error('Error locking line:', lockError);
        socket.emit('line-locked-error', {
          lineNumber,
          message: 'Server error when locking line'
        });
      }
    } catch (error) {
      console.error('Error auto-locking line:', error);
    }
  });

  // Handle automatic line unlocking
  socket.on('auto-unlock-line', async (data) => {
    try {
      const { documentId, lineNumber } = data;
      
      // Skip processing if user is not authenticated
      if (!socket.isAuthenticated || !socket.userId) {
        console.warn(`Auto-unlock attempt without authentication: ${socket.id}`);
        return;
      }
      
      // Validate document ID
      if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
        console.warn(`Invalid document ID for auto-unlock: ${documentId}`);
        return;
      }
      
      const document = await Document.findById(documentId);
      if (!document) {
        console.warn(`Document not found for auto-unlock: ${documentId}`);
        return;
      }
      
      // Check if user has access to the document
      if (!document.hasAccess(socket.userId)) {
        console.warn(`User ${socket.userId} attempted to auto-unlock without access to document ${documentId}`);
        return;
      }
      
      // Check if line is locked by this user
      const lockIndex = document.lockedLines.findIndex(lock => 
        lock.lineNumber === lineNumber && lock.lockedBy.toString() === socket.userId
      );
      
      if (lockIndex === -1) return; // Not locked by this user
      
      // Unlock the line
      document.lockedLines.splice(lockIndex, 1);
      await document.save();
      
      // Broadcast to all clients
      io.to(documentId).emit('line-unlocked', {
        documentId,
        lineNumber
      });
    } catch (error) {
      console.error('Error auto-unlocking line:', error);
    }
  });

  // Handle comment events
  socket.on('add-comment', async (data) => {
    try {
      const { documentId, lineNumber, content } = data;
      
      // Broadcast to all clients for real-time updates
      socket.to(documentId).emit('comment-added', {
        documentId,
        lineNumber,
        content,
        author: {
          _id: socket.userId,
          name: socket.userName || 'Anonymous'
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error broadcasting comment:', error);
    }
  });

  // Handle document version creation
  socket.on('create-version', async (data) => {
    try {
      const { documentId, content, previousContent, description } = data;
      
      // Skip if user is not authenticated
      if (!socket.isAuthenticated || !socket.userId) {
        socket.emit('version-error', { message: 'Authentication required to create versions' });
        return;
      }
      
      const document = await Document.findById(documentId);
      if (!document) {
        socket.emit('version-error', { message: 'Document not found' });
        return;
      }
      
      // Only allow version creation for document owners and collaborators
      if (!document.hasAccess(socket.userId)) {
        socket.emit('version-error', { message: 'Access denied: You are not a collaborator on this document' });
        return;
      }
      
      // Create a diff between the previous version and current content
      const diff = versionUtils.createDiff(previousContent || document.content, content);
      const diffSummary = versionUtils.getDiffSummary(diff);
      
      // Add version to document
      document.addVersion(content, socket.userId, diff, description || diffSummary);
      await document.save();
      
      // Notify all clients in the room about the new version
      io.to(documentId).emit('version-created', {
        documentId,
        version: document.version,
        versionData: document.versions[document.versions.length - 1],
        summary: diffSummary,
        createdBy: {
          userId: socket.userId,
          userName: socket.userName
        }
      });
    } catch (error) {
      console.error('Error creating version:', error);
      socket.emit('version-error', { message: 'Error creating version' });
    }
  });

  // Handle version restoration
  socket.on('restore-version', async (data) => {
    try {
      const { documentId, versionNumber } = data;
      
      // Skip if user is not authenticated
      if (!socket.isAuthenticated || !socket.userId) {
        socket.emit('version-error', { message: 'Authentication required to restore versions' });
        return;
      }
      
      const document = await Document.findById(documentId);
      if (!document) {
        socket.emit('version-error', { message: 'Document not found' });
        return;
      }
      
      // Only allow version restoration for document owners and collaborators
      if (!document.hasAccess(socket.userId)) {
        socket.emit('version-error', { message: 'Access denied: You are not a collaborator on this document' });
        return;
      }
      
      // Restore to specified version
      const success = document.restoreVersion(parseInt(versionNumber));
      if (!success) {
        socket.emit('version-error', { message: 'Version not found' });
        return;
      }
      
      await document.save();
      
      // Notify all clients in the room about the restored version
      io.to(documentId).emit('version-restored', {
        documentId,
        content: document.content,
        restoredVersion: versionNumber,
        restoredBy: {
          userId: socket.userId,
          userName: socket.userName
        }
      });
    } catch (error) {
      console.error('Error restoring version:', error);
      socket.emit('version-error', { message: 'Error restoring version' });
    }
  });

  socket.on('disconnect', async () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Auto-unlock lines when user disconnects
    try {
      // For each active document, check if user has locked lines
      for (const documentId of activeDocuments) {
        const document = await Document.findById(documentId);
        if (document) {
          const lockedLinesByUser = document.lockedLines.filter(
            lock => lock.lockedBy.toString() === socket.userId
          );
          
          if (lockedLinesByUser.length > 0) {
            // Remove all locks by this user
            document.lockedLines = document.lockedLines.filter(
              lock => lock.lockedBy.toString() !== socket.userId
            );
            await document.save();
            
            // Notify everyone that lines were unlocked
            lockedLinesByUser.forEach(lock => {
              io.to(documentId).emit('line-unlocked', {
                documentId,
                lineNumber: lock.lineNumber,
                reason: 'user_disconnected'
              });
            });
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up locks on disconnect:', error);
    }
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-editor')
  .then(() => {
    console.log('MongoDB connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  }); 