const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collab-editor');
    console.log('MongoDB connected successfully');
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const resetDocuments = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Load the Document model
    const Document = require('./models/Document');
    
    // Find all documents
    const documents = await Document.find();
    console.log(`Found ${documents.length} documents`);
    
    let updatedCount = 0;
    
    // Process each document
    for (const doc of documents) {
      let modified = false;
      
      // Check for validation issues in lineEdits
      if (doc.lineEdits && doc.lineEdits.length > 0) {
        // Filter out invalid entries
        const validLineEdits = doc.lineEdits.filter(edit => 
          edit.editedBy && edit.lineNumber !== undefined
        );
        
        if (validLineEdits.length !== doc.lineEdits.length) {
          doc.lineEdits = validLineEdits;
          modified = true;
          console.log(`Fixed lineEdits in document: ${doc._id}`);
        }
      }
      
      // Check for validation issues in lockedLines
      if (doc.lockedLines && doc.lockedLines.length > 0) {
        // Filter out invalid entries
        const validLockedLines = doc.lockedLines.filter(lock => 
          lock.lockedBy && lock.lineNumber !== undefined
        );
        
        if (validLockedLines.length !== doc.lockedLines.length) {
          doc.lockedLines = validLockedLines;
          modified = true;
          console.log(`Fixed lockedLines in document: ${doc._id}`);
        }
      }
      
      // Save if modified
      if (modified) {
        await doc.save();
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} documents`);
    console.log('Document cleanup complete');
    
  } catch (error) {
    console.error('Error resetting documents:', error);
  } finally {
    // Disconnect from database
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
};

// Run the reset function
resetDocuments().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 