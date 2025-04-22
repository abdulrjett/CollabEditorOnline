# Collaborative Text Editor

A real-time collaborative text editor with features for document sharing, line locking, commenting, and AI-powered writing assistance.

## Features

### Collaborative Editing

- Real-time collaborative text editing
- Line-level locking to prevent edit conflicts
- Automatic sync across all connected users
- Visual indicators of who is editing which lines

### Document Management

- Create, edit, and share documents
- Share documents via email or shareable links
- Manage document permissions
- Dashboard for document organization

### Commenting System

- Add comments to specific lines
- Real-time comment notifications
- Mark comments as resolved
- Comment thread viewing and management

### ✨ AI-Powered Rhyme & Synonym Suggestions

- Uses Python NLP libraries (NLTK + Pronouncing) for advanced text analysis
- Suggests rhyming words based on user's word selection
- Provides synonyms to enhance your vocabulary
- Real-time integration with the text editor
- Perfect for poets, writers, and students looking to enhance their writing

## Tech Stack

- **Frontend**: React.js, Quill.js, Socket.IO Client
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MongoDB
- **Authentication**: JWT
- **Real-time**: Socket.IO, Operational Transformation

## Project Structure

```
collaborative-text-editor/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── .env                    # Environment variables
└── README.md              # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn
- Python 3.7+ (for NLP features)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Set up the Python NLP service

   ```bash
   cd nlp_server
   pip install -r requirements.txt
   cd ..
   ```

4. Create .env files in both client and server directories
5. Start the development servers:

   ```bash
   # Start backend server
   cd server
   npm run dev

   # Start frontend server
   cd ../client
   npm start

   # Start the Python NLP server
   cd nlp_server
   python app.py
   ```

## API Documentation

### Authentication Endpoints

- POST /api/auth/signup - Register new user
- POST /api/auth/login - User login

### Document Endpoints

- POST /api/documents - Create document
- GET /api/documents/:id - Get document
- PUT /api/documents/:id - Update document
- DELETE /api/documents/:id - Delete document

### Collaboration Endpoints

- POST /api/collaborate/:id - Join document session
- POST /api/lock/:id/line - Lock document line

## Usage

1. Register a new account or log in with existing credentials
2. Create a new document from the dashboard
3. Edit the document with real-time collaborative features
4. Share the document with others for collaboration
5. Use the AI suggestion feature by selecting a word in the editor and clicking the magic wand icon

## License

MIT
