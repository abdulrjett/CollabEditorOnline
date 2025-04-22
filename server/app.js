require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const notificationRoutes = require('./routes/notifications');
const commentRoutes = require('./routes/comments');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collab-editor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', auth, documentRoutes);
app.use('/api/notifications', auth, notificationRoutes);
app.use('/api/comments', auth, commentRoutes);

// Check if build directory exists
const buildPath = path.join(__dirname, '../client/build');
const buildExists = fs.existsSync(buildPath);

if (buildExists) {
  // Serve static files from the React app
  app.use(express.static(buildPath));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // In development mode, just serve API endpoints
  app.get('/', (req, res) => {
    res.json({ message: 'API is running. Please use the API endpoints or start the client application separately.' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (!buildExists) {
    console.log('Note: Running in development mode. Client build directory not found.');
    console.log('To use the API directly, access endpoints at http://localhost:' + PORT + '/api/...');
    console.log('To use the full application, please run the React client separately with "npm start" in the client directory.');
  }
}); 