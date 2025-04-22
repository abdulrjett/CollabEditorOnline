const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shareLink: {
    type: String,
    default: null
  },
  version: {
    type: Number,
    default: 1
  },
  versions: [{
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    diff: {
      type: String,
      default: null
    },
    versionNumber: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  }],
  lockedLines: [{
    lineNumber: {
      type: Number,
      required: true
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lineEdits: [{
    lineNumber: {
      type: Number,
      required: true
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastModified timestamp before saving
documentSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

// Method to add a new version
documentSchema.methods.addVersion = function(content, userId, diff, description = '') {
  const versionNumber = this.version + 1;
  this.versions.push({
    content,
    author: userId,
    diff,
    versionNumber,
    description
  });
  this.version = versionNumber;
};

// Method to get specific version
documentSchema.methods.getVersion = function(versionNumber) {
  return this.versions.find(v => v.versionNumber === versionNumber);
};

// Method to restore a previous version
documentSchema.methods.restoreVersion = function(versionNumber) {
  const version = this.getVersion(versionNumber);
  if (version) {
    this.content = version.content;
    return true;
  }
  return false;
};

// Method to lock a line
documentSchema.methods.lockLine = function(lineNumber, userId) {
  // Check if line is already locked
  const existingLock = this.lockedLines.find(lock => lock.lineNumber === lineNumber);
  if (existingLock) {
    return false;
  }

  this.lockedLines.push({
    lineNumber,
    lockedBy: userId
  });
  return true;
};

// Method to unlock a line
documentSchema.methods.unlockLine = function(lineNumber, userId) {
  const lockIndex = this.lockedLines.findIndex(lock => 
    lock.lineNumber === lineNumber && lock.lockedBy.toString() === userId.toString()
  );

  if (lockIndex === -1) {
    return false;
  }

  this.lockedLines.splice(lockIndex, 1);
  return true;
};

// Method to check if a line is locked
documentSchema.methods.isLineLocked = function(lineNumber) {
  return this.lockedLines.some(lock => lock.lineNumber === lineNumber);
};

// Method to get the user who locked a line
documentSchema.methods.getLineLocker = function(lineNumber) {
  const lock = this.lockedLines.find(lock => lock.lineNumber === lineNumber);
  return lock ? lock.lockedBy : null;
};

// Method to check if a user has access to the document
documentSchema.methods.hasAccess = function(userId) {
  const ownerId = this.owner.toString();
  const collaboratorIds = this.collaborators.map(id => id.toString());
  
  return userId.toString() === ownerId || collaboratorIds.includes(userId.toString());
};

// Method to record line edit
documentSchema.methods.recordLineEdit = function(lineNumber, userId) {
  // Look for existing edit on this line
  const existingEditIndex = this.lineEdits.findIndex(edit => 
    edit.lineNumber === lineNumber
  );
  
  if (existingEditIndex >= 0) {
    // Update existing edit
    this.lineEdits[existingEditIndex].editedBy = userId;
    this.lineEdits[existingEditIndex].editedAt = new Date();
  } else {
    // Add new edit record
    this.lineEdits.push({
      lineNumber,
      editedBy: userId,
      editedAt: new Date()
    });
  }
  
  return true;
};

// Method to get line edit information
documentSchema.methods.getLineEditor = function(lineNumber) {
  const edit = this.lineEdits.find(edit => edit.lineNumber === lineNumber);
  return edit ? edit.editedBy : null;
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document; 