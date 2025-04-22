# Collaborative Text Editor

A real-time collaborative text editor with features for document sharing, line locking, commenting, AI-powered writing assistance and advanced theme/genre analysis.

## Features

### Collaborative Editing
- Real-time collaborative text editing with multiple users
- Line-level locking to prevent edit conflicts
- Automatic sync across all connected users
- Visual indicators of who is editing which lines
- Version history with diff tracking and restore capabilities

### Document Management
- Create, edit, and share documents
- Share documents via email or shareable links
- Manage document permissions (view, edit, admin)
- Dashboard for document organization with folders and tags
- Search functionality to quickly find documents

### Commenting System
- Add comments to specific lines
- Real-time comment notifications
- Mark comments as resolved
- Comment thread viewing and management
- Comment history tracking

### ✨ AI-Powered Features
- **Rhyme & Synonym Suggestions**
  - Get rhyming words based on selected text
  - Access synonyms to enhance vocabulary
  - Perfect for poets and creative writers
- **Advanced Theme Analysis**
  - AI-powered theme detection using zero-shot classification
  - Identifies themes like Love, Science, Technology, Politics, etc.
  - Quantifies theme presence with percentage scores
- **Genre Classification**
  - Automatically detects document genres (Essay, Poetry, Technical, etc.)
  - Combines AI with structural text analysis
  - Helps categorize and organize content
- **Keyword Extraction**
  - Identifies important concepts and terms in the document
  - Useful for tagging and search optimization

## Tech Stack

### Frontend
- **Framework**: React.js
- **Text Editor**: Quill.js
- **Real-time**: Socket.IO Client
- **UI Components**: Material-UI
- **State Management**: React Context API

### Backend
- **Server**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **Real-time Communication**: Socket.IO
- **Collaboration**: Operational Transformation

### NLP Server
- **Language**: Python
- **AI Models**: Hugging Face's BART large model
- **NLP Libraries**: NLTK, spaCy, Pronouncing
- **API**: Flask REST API

## Project Structure

```
collaborative-text-editor/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── services/       # API services
│   │   ├── context/        # React context providers
│   │   └── App.js          # Main application
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── server/                 # Node.js backend
│   ├── models/             # Database models
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   ├── utils/              # Utility functions
│   └── server.js           # Main server file
├── nlp_server/             # Python NLP service
│   ├── app.py              # Flask API for NLP features
│   └── requirements.txt    # Python dependencies
├── start.sh                # Startup script for Unix/Mac
├── start.bat               # Startup script for Windows
├── setup.sh                # Setup script for Unix/Mac
└── README.md               # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn
- Python 3.8+ (for NLP features)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/abdulrjett/CollabEditorOnline.git
  
   ```

2. Install backend dependencies
   ```bash
   cd server
   npm install
   cd ..
   ```

3. Install frontend dependencies
   ```bash
   cd client
   npm install
   cd ..
   ```

4. Set up the Python NLP service (choose one option):

   **Option 1: Easy Installation (Recommended)**
   ```bash
   # Windows
   cd nlp_server
   install_and_run.bat
   
   # macOS/Linux
   cd nlp_server
   bash install_and_run.sh
   ```

   **Option 2: Manual Installation**
   ```bash
   cd nlp_server
   pip install -r requirements.txt
   python -c "import nltk; nltk.download('wordnet'); nltk.download('stopwords'); nltk.download('punkt'); nltk.download('averaged_perceptron_tagger'); nltk.download('brown')"
   cd ..
   ```

5. Configure environment variables:
   - Create `.env` files in the server, client, and nlp_server directories
   - For server: Set `MONGODB_URI`, `JWT_SECRET`, etc.
   - For client: Set `REACT_APP_API_URL`, etc.

### Running the Application

**Option 1: Using the startup scripts**
```bash
# Windows
start.bat

# macOS/Linux
bash start.sh
```

**Option 2: Manual startup**
```bash
# Terminal 1: Start the Node.js server
cd server
npm run dev

# Terminal 2: Start the NLP server
cd nlp_server
python app.py

# Terminal 3: Start the React client
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- NLP Service: http://localhost:5001

## API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Document Endpoints
- `POST /api/documents` - Create document
- `GET /api/documents` - List user's documents
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/share` - Share document

### Collaboration Endpoints
- `POST /api/collaborate/:id` - Join document session
- `POST /api/lock/:id/line` - Lock document line
- `GET /api/history/:id` - Get document version history
- `GET /api/history/:id/:version` - Get specific document version

### NLP Service Endpoints
- `POST /analyze_text` - Analyze document themes and genres
- `GET /get_rhymes?word=example` - Get rhyming words
- `GET /get_synonyms?word=example` - Get synonym suggestions
- `GET /get_definition?word=example` - Get word definition

## Usage Guide

1. Register a new account or log in with existing credentials
2. Create a new document from the dashboard
3. Edit the document with real-time collaborative features
4. Use AI-powered features:
   - For rhymes/synonyms: Select a word and click the magic wand icon
   - For theme analysis: Click the "Analyze" button in the toolbar
5. Share the document with others by entering their email or generating a link
6. Add comments by clicking the comment icon next to any line
7. View version history through the "History" tab

## License

MIT 
