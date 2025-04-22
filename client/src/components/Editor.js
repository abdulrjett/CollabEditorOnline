import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper as MuiPaper,
  Grid,
  Snackbar,
  Badge
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CommentIcon from '@mui/icons-material/Comment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import './Editor.css';
import CommentBox from './CommentBox';
import RhymeSuggestionPanel from './RhymeSuggestionPanel';
import VersionHistoryPanel from './VersionHistoryPanel';
import VersionComparePanel from './VersionComparePanel';
import HistoryIcon from '@mui/icons-material/History';
import { differenceInMinutes } from 'date-fns';
import ThemeAnalysisPanel from './ThemeAnalysisPanel';
import PsychologyIcon from '@mui/icons-material/Psychology';
import DefinitionPanel from './DefinitionPanel';

// Custom Paper component with 3D effects
const EnhancedPaper = ({ children, ...props }) => (
  <MuiPaper 
    {...props} 
    elevation={6}
    sx={{ 
      ...props.sx,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 2,
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        transform: 'translateY(-2px)'
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
        zIndex: 1
      }
    }}
  >
    {children}
  </MuiPaper>
);

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lockedLines, setLockedLines] = useState([]);
  const [lineEdits, setLineEdits] = useState([]);
  const [selectedLine, setSelectedLine] = useState(null);
  const [activeLines, setActiveLines] = useState([]);
  const [commentBoxConfig, setCommentBoxConfig] = useState({
    isOpen: false,
    lineNumber: null,
    isMinimized: false
  });
  const [comments, setComments] = useState([]);
  const [userCursors, setUserCursors] = useState({});
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [selectedWord, setSelectedWord] = useState('');
  const [showRhymeSuggestions, setShowRhymeSuggestions] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [compareVersions, setCompareVersions] = useState(false);
  const [oldVersion, setOldVersion] = useState(null);
  const [newVersion, setNewVersion] = useState(null);
  const [lastVersionSave, setLastVersionSave] = useState(null);
  const [showThemeAnalysis, setShowThemeAnalysis] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const [definitionWord, setDefinitionWord] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [clickTimeout, setClickTimeout] = useState(null);
  
  const socketRef = useRef();
  const contentRef = useRef('');
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const textAreaRef = useRef(null);
  const autoLockTimeoutRef = useRef(null);
  const changedLinesRef = useRef([]);
  const previousContentRef = useRef('');
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchDocument();
    setupSocket();
    fetchComments();
    fetchLineEdits();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (autoLockTimeoutRef.current) {
        clearTimeout(autoLockTimeoutRef.current);
      }
    };
  }, [id, isAuthenticated, navigate]);

  // Sync scroll between text area and line numbers
  useEffect(() => {
    const syncScroll = () => {
      if (lineNumbersRef.current && textAreaRef.current) {
        lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
      }
    };

    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.addEventListener('scroll', syncScroll);
      return () => textArea.removeEventListener('scroll', syncScroll);
    }
  }, [document]);

  // Auto-lock the line that's being edited
  useEffect(() => {
    if (activeLines.length > 0 && socketRef.current && isAuthenticated && user?.id) {
      // Schedule auto-lock
      if (autoLockTimeoutRef.current) {
        clearTimeout(autoLockTimeoutRef.current);
      }
      
      autoLockTimeoutRef.current = setTimeout(() => {
        activeLines.forEach(lineNumber => {
          // Check if the line is already locked by this user
          const isLockedByCurrentUser = lockedLines.some(
            lock => lock.lineNumber === lineNumber && lock.lockedBy === user.id
          );
          
          // Check if the line is locked by someone else
          const isLockedByOther = lockedLines.some(
            lock => lock.lineNumber === lineNumber && lock.lockedBy !== user.id
          );
          
          if (!isLockedByCurrentUser && !isLockedByOther) {
            // Auto-lock the line
            socketRef.current.emit('auto-lock-line', {
              documentId: id,
              lineNumber
            });
          }
        });
      }, 500); // Reduced wait time to 500ms for quicker locking
      
      return () => {
        if (autoLockTimeoutRef.current) {
          clearTimeout(autoLockTimeoutRef.current);
        }
      };
    }
  }, [activeLines, id, lockedLines, user, isAuthenticated]);

  // Handle document title changes
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setDocument(prev => ({ ...prev, title: newTitle }));
    
    // Debounce saving to avoid too many API calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const token = localStorage.getItem('token');
        await axios.patch(`${process.env.REACT_APP_API_URL}/api/documents/${id}`, 
          { title: newTitle },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (socketRef.current) {
          socketRef.current.emit('document-updated', {
            documentId: id,
            title: newTitle
          });
        }
        
        setDocument(prev => ({ 
          ...prev, 
          title: newTitle,
          lastSaved: new Date().toISOString()
        }));
        
      } catch (error) {
        console.error('Error saving document title:', error);
        showNotification('Error saving title. Please try again.', 'error');
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  // Handle automatic version creation after significant edits
  useEffect(() => {
    // Store the initial content as the previous version reference
    if (document && document.content && !previousContentRef.current) {
      previousContentRef.current = document.content;
    }
  }, [document]);

  const fetchDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDocument(response.data);
      contentRef.current = response.data.content;
      
      // Fetch locked lines
      const lockedLinesResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/documents/${id}/locked-lines`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setLockedLines(lockedLinesResponse.data);
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Error loading document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLineEdits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/documents/${id}/line-edits`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setLineEdits(response.data);
    } catch (error) {
      console.error('Error fetching line edits:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/comments/document/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const setupSocket = () => {
    if (!isAuthenticated || !localStorage.getItem('token')) {
      console.warn('Not authenticated, socket connection skipped');
      return;
    }

    // Get token and ensure it's clean (remove any "Bearer " prefix if present)
    const token = localStorage.getItem('token').replace('Bearer ', '');
    
    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: token,
        userId: user.id // Include user ID explicitly for easier authentication
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Log connection status
    socketRef.current.on('connect', () => {
      console.log('Socket connected with auth token');
      // Make sure we've joined the right document room
      socketRef.current.emit('join-document', id);
      
      // Check authentication status after connection
      socketRef.current.emit('check-auth', { userId: user.id }, (response) => {
        if (response && response.authenticated) {
          console.log('Socket authentication verified');
        } else {
          console.error('Socket authentication failed after connection');
          showNotification('Authentication issue detected. Reconnecting...', 'warning');
          socketRef.current.disconnect();
          setTimeout(setupSocket, 1000);
        }
      });
    });
    
    // Document updates from other users
    socketRef.current.on('document-update', (data) => {
      if (data.userId !== user.id) {
        setDocument(prev => ({ ...prev, content: data.content }));
        contentRef.current = data.content;
      }
    });

    // Line locking events
    socketRef.current.on('line-locked', (data) => {
      if (data.documentId === id) {
        setLockedLines(prev => [...prev, data.lock]);
        showNotification(`Line ${data.lock.lineNumber + 1} locked by another user`, 'warning');
      }
    });

    socketRef.current.on('line-unlocked', (data) => {
      if (data.documentId === id) {
        setLockedLines(prev => prev.filter(lock => lock.lineNumber !== data.lineNumber));
        showNotification(`Line ${data.lineNumber + 1} unlocked`, 'info');
      }
    });
    
    // Line lock error (e.g., when trying to auto-lock a line already locked)
    socketRef.current.on('line-locked-error', (data) => {
      // Don't show authentication errors to avoid too many notifications
      if (!data.message.includes('Authentication required')) {
        showNotification(data.message, 'error');
      }
    });
    
    // Connection error handling
    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      showNotification('Lost connection to server. Trying to reconnect...', 'error');
    });

    // Authentication error handling
    socketRef.current.on('auth_error', (error) => {
      console.error('Socket authentication error:', error);
      showNotification('Authentication error. Reconnecting with new token...', 'error');
      
      // Force reconnection with fresh token
      socketRef.current.disconnect();
      setupSocket();
    });
    
    // Line edits updates
    socketRef.current.on('line-edits-updated', (data) => {
      if (data.documentId === id) {
        fetchLineEdits(); // Refresh line edits when they change
      }
    });
    
    // Comment events
    socketRef.current.on('comment-added', (data) => {
      if (data.documentId === id) {
        fetchComments(); // Refresh comments when a new one is added
        showNotification('New comment added', 'info');
      }
    });
    
    // Cursor position events
    socketRef.current.on('cursor-position', (data) => {
      setUserCursors(prev => ({
        ...prev,
        [data.userId]: {
          position: data.position,
          name: data.userName
        }
      }));
    });

    // Setup socket events for versioning
    socketRef.current.on('version-created', (data) => {
      if (data.documentId === id) {
        showNotification(`Version ${data.version} created by ${data.createdBy.userName || 'a collaborator'}`, 'info');
      }
    });
    
    socketRef.current.on('version-restored', (data) => {
      if (data.documentId === id) {
        setDocument(prev => ({
          ...prev,
          content: data.content
        }));
        contentRef.current = data.content;
        previousContentRef.current = data.content;
        
        showNotification(
          `Document restored to version ${data.restoredVersion} by ${data.restoredBy.userName || 'a collaborator'}`,
          'info'
        );
      }
    });
    
    socketRef.current.on('content-diff', (data) => {
      // You could show real-time diff indicators here if desired
      console.log('Received diff', data);
    });
    
    socketRef.current.on('version-error', async (data) => {
      console.error('Version error:', data.message);
      
      // Handle authentication errors specifically
      if (data.message.includes('Authentication required')) {
        console.log('Auth token issue detected. Current token:', localStorage.getItem('token'));
        
        // Instead of showing the error, try the REST API fallback
        console.log('Attempting to create version via REST API due to socket auth failure');
        try {
          const token = localStorage.getItem('token');
          if (token) {
            await createVersionViaREST(token);
          } else {
            showNotification('Authentication required to create versions', 'error');
          }
        } catch (error) {
          console.error('REST fallback also failed:', error);
          showNotification('Failed to create version: ' + data.message, 'error');
        }
      } else {
        // For other errors, show the notification
        showNotification(data.message, 'error');
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  };

  const saveDocumentDebounced = useCallback((content, changedLines) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const token = localStorage.getItem('token');
        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/documents/${id}`,
          { 
            content,
            changedLines 
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        socketRef.current.emit('document-change', {
          documentId: id,
          content,
          changedLines
        });
        
        // Reset changed lines after saving
        changedLinesRef.current = [];
        
        setSaving(false);
      } catch (error) {
        console.error('Error saving document:', error);
        if (error.response?.data?.lockedLine !== undefined) {
          showNotification(`Line ${error.response.data.lockedLine + 1} is locked by another user`, 'error');
        } else {
          setError('Error saving document. Please try again.');
        }
        setSaving(false);
      }
    }, 1000); // Debounce time of 1 second
  }, [id]);

  // Function to get the selected word from the text area
  const getSelectedWord = () => {
    if (!textAreaRef.current) return '';
    
    const textarea = textAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) return ''; // No selection
    
    const selection = textarea.value.substring(start, end).trim();
    
    // If the selection contains spaces, just get the first word
    const firstWord = selection.split(/\s+/)[0];
    return firstWord;
  };

  // Handle text selection in the editor
  const handleTextSelection = () => {
    const word = getSelectedWord();
    if (word && word.length > 1) {
      setSelectedWord(word);

      // Check if NLP service is available
      fetch(`${process.env.REACT_APP_API_URL}/api/nlp/health`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'unavailable') {
            // Show notification that NLP service is not available
            showNotification('AI suggestion service is currently unavailable. Starting the NLP server may resolve this issue.', 'warning');
          }
        })
        .catch(() => {
          // Fail silently, the RhymeSuggestionPanel will show its own error
        });
      
      // Only show suggestions if it's a real word (more than one character)
      if (showRhymeSuggestions) {
        // Only update if we already had the panel open
        setShowRhymeSuggestions(true);
      }
    }
  };

  // Handle closing the rhyme suggestion panel
  const handleCloseRhymeSuggestions = () => {
    setShowRhymeSuggestions(false);
  };

  // Handle selecting a suggestion
  const handleSelectSuggestion = (word) => {
    if (!textAreaRef.current) return;
    
    const textarea = textAreaRef.current;
    const text = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Replace the selected word with the suggestion
    const newText = text.substring(0, start) + word + text.substring(end);
    
    // Update the content
    contentRef.current = newText;
    setDocument({...document, content: newText});
    
    // Get the line numbers that were changed
    const linesChanged = getChangedLines(text, newText);
    changedLinesRef.current = Array.from(new Set([...changedLinesRef.current, ...linesChanged]));
    
    // Schedule the save
    saveDocumentDebounced(newText, changedLinesRef.current);
    
    // If socket is connected, emit the change
    if (socketRef.current) {
      socketRef.current.emit('document-change', {
        documentId: id,
        content: newText,
        changedLines: linesChanged,
        cursorPosition: { start: start + word.length, end: start + word.length }
      });
    }
    
    // Focus back on the textarea and close the suggestions
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + word.length, start + word.length);
    }, 0);
    
    showNotification(`Replaced with "${word}"`, 'success');
  };

  // Handle content change and track changes for versioning
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    const previousValue = contentRef.current;
    contentRef.current = newContent;
    setDocument(prev => ({ ...prev, content: newContent }));
    
    // Get the changed lines
    const changedLines = getChangedLines(previousValue, newContent);
    
    // Update the active lines
    setActiveLines(changedLines);
    
    // Check if enough time has passed for auto-versioning (10 minutes)
    if (changedLines.length > 0) {
      const now = new Date();
      if (lastVersionSave && differenceInMinutes(now, lastVersionSave) >= 10) {
        createDocumentVersion(null, 'Auto-saved version');
      }
    }
    
    // Add to the list of changed lines for saving
    changedLinesRef.current = Array.from(new Set([...changedLinesRef.current, ...changedLines]));
    
    // Schedule save after changes
    saveDocumentDebounced(newContent, changedLinesRef.current);
    
    // Perform text selection handling
    handleTextSelection();
    
    // If socket is connected, emit the change
    if (socketRef.current) {
      const cursorPosition = {
        start: e.target.selectionStart,
        end: e.target.selectionEnd
      };
      
      socketRef.current.emit('document-change', {
        documentId: id,
        content: newContent,
        changedLines,
        cursorPosition,
        previousContent: previousContentRef.current
      });
      
      // Update previous content ref after emitting changes
      previousContentRef.current = newContent;
    }
  };

  // Create a new document version
  const createDocumentVersion = async (event, description = '') => {
    if (!isAuthenticated) {
      showNotification('You must be logged in to create versions', 'error');
      return;
    }
    
    try {
      // Ensure we have a valid token
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Authentication token not found. Please log in again.', 'error');
        return;
      }
      
      // Use REST API directly - more reliable than socket for version creation
      console.log('Creating version directly via REST API');
      const success = await createVersionViaREST(token, description);
      
      if (success) {
        console.log('Version created successfully via REST API');
      } else {
        console.log('REST API version creation returned false');
      }
    } catch (error) {
      console.error('Error creating version:', error);
      showNotification('Error creating version. Please try again.', 'error');
    }
  };
  
  // Fallback method using direct REST API
  const createVersionViaREST = async (token, description = '', retryAfterRefresh = true) => {
    try {
      console.log('Creating version via REST API fallback');
      showNotification('Creating version using API...', 'info');
      
      // Make sure we have the token
      if (!token) {
        const newToken = localStorage.getItem('token');
        if (!newToken) {
          throw new Error('No authentication token available');
        }
        token = newToken.replace('Bearer ', '');
      }
      
      // Make sure we have content
      if (!document || !document.content) {
        throw new Error('Document content not available');
      }
      
      // Calculate diff using simple approach (server will do proper diff)
      const diff = JSON.stringify([
        [0, document.content]  // Simple full-content diff
      ]);
      
      // Log request details for debugging
      console.log('Version creation request details:', {
        url: `${process.env.REACT_APP_API_URL}/api/documents/${id}/versions`,
        documentId: id,
        contentLength: document.content.length,
        hasToken: !!token,
        description
      });
      
      // Add full Authorization header with Bearer prefix
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/documents/${id}/versions`,
        {
          content: document.content,
          diff,
          description: description || 'Manual save'
        },
        {
          headers: {
            'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Version API response:', response.data);
      
      if (response.data) {
        // Update timestamp of last version save
        setLastVersionSave(new Date());
        
        // Update previous content ref after creating version
        previousContentRef.current = document.content;
        
        showNotification('Document version created successfully', 'success');
        return true;
      }
      return false;
    } catch (error) {
      console.error('REST API version creation failed:', error);
      
      // Log detailed error information
      if (error.response) {
        // Check if it's an authentication error (401 or 403)
        if ((error.response.status === 401 || error.response.status === 403) && retryAfterRefresh) {
          console.log('Authentication error. Attempting to refresh token and retry...');
          
          // Try to refresh the token
          const refreshSuccessful = await refreshToken();
          if (refreshSuccessful) {
            // Retry with the new token
            const newToken = localStorage.getItem('token');
            console.log('Token refreshed, retrying version creation');
            return await createVersionViaREST(newToken, description, false); // Prevent infinite recursion
          } else {
            showNotification('Authentication failed. Please log in again.', 'error');
          }
          return false;
        }
        
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // Show specific error message from API if available
        showNotification(
          `Error: ${error.response.data?.message || 'Server returned ' + error.response.status}`, 
          'error'
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        showNotification('Error: No response from server', 'error');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        showNotification(`Error: ${error.message}`, 'error');
      }
      
      return false;
    }
  };

  // Add a method to easily show word definitions
  const showWordDefinition = (word) => {
    if (word && word.trim().length > 1) {
      const trimmedWord = word.trim();
      setDefinitionWord(trimmedWord);
      setShowDefinition(true);
    }
  };
  
  // Handle directly selecting a word for definition from toolbar
  const handleShowDefinitionClick = () => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    
    const text = textarea.value;
    let start, end;
    
    // Check if there's already a selection
    if (textarea.selectionStart !== textarea.selectionEnd) {
      // Use the existing selection
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
    } else {
      // Get the word at cursor position
      start = textarea.selectionStart;
      
      // Find word boundaries around the cursor position
      let wordStart = start;
      while (wordStart > 0 && /\w/.test(text[wordStart - 1])) {
        wordStart--;
      }
      
      let wordEnd = start;
      while (wordEnd < text.length && /\w/.test(text[wordEnd])) {
        wordEnd++;
      }
      
      start = wordStart;
      end = wordEnd;
    }
    
    if (end > start) {
      const word = text.substring(start, end).trim();
      if (word && word.length > 1) {
        showWordDefinition(word);
        
        // Update selection to highlight the word
        textarea.setSelectionRange(start, end);
      }
    }
  };

  const handleLineClick = (lineNumber) => {
    setSelectedLine(lineNumber);
    
    // If this line is being edited, report cursor position to other users
    socketRef.current.emit('cursor-position', {
      documentId: id,
      position: lineNumber,
      userId: user.id,
      userName: user.name
    });
  };

  const handleLockLine = async (lineNumber) => {
    if (!isAuthenticated) {
      showNotification('You must be logged in to lock lines', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Authentication token not found. Please log in again.', 'error');
        return;
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/documents/${id}/lock`,
        { lineNumber },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        const newLock = {
          lineNumber,
          lockedBy: user.id,
          lockedAt: new Date()
        };
        setLockedLines(prev => [...prev, newLock]);
        socketRef.current.emit('line-locked', { 
          documentId: id, 
          lineNumber, 
          lockedBy: user.id,
          lock: newLock
        });
        setError('');
        showNotification(`Line ${lineNumber + 1} locked`, 'success');
      }
    } catch (error) {
      console.error('Lock line error:', error);
      if (error.response) {
        const errorMessage = error.response.data.message || 'Error locking line';
        showNotification(errorMessage, 'error');
        setError(errorMessage);
      } else {
        showNotification('Error locking line. Please try again.', 'error');
        setError('Error locking line. Please try again.');
      }
    }
  };

  const handleUnlockLine = async (lineNumber) => {
    if (!isAuthenticated) {
      showNotification('You must be logged in to unlock lines', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Authentication token not found. Please log in again.', 'error');
        return;
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/documents/${id}/unlock`,
        { lineNumber },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        setLockedLines(prev => prev.filter(lock => lock.lineNumber !== lineNumber));
        socketRef.current.emit('line-unlocked', { 
          documentId: id, 
          lineNumber 
        });
        setError('');
        showNotification(`Line ${lineNumber + 1} unlocked`, 'success');
        
        // Remove from active lines as well
        setActiveLines(prev => prev.filter(line => line !== lineNumber));
      }
    } catch (error) {
      console.error('Unlock line error:', error);
      if (error.response) {
        const errorMessage = error.response.data.message || 'Error unlocking line';
        showNotification(errorMessage, 'error');
        setError(errorMessage);
      } else {
        showNotification('Error unlocking line. Please try again.', 'error');
        setError('Error unlocking line. Please try again.');
      }
    }
  };

  const handleLockUnlock = async (lineNumber) => {
    if (!isAuthenticated) {
      showNotification('You must be logged in to lock/unlock lines', 'error');
      return;
    }

    const isLocked = isLineLocked(lineNumber);
    
    try {
      if (isLocked) {
        // Check if current user is the line locker or the document owner
        if (canUnlockLine(lineNumber)) {
          await handleUnlockLine(lineNumber);
        } else {
          const errorMessage = 'This line is locked by another user';
          setError(errorMessage);
          showNotification(errorMessage, 'error');
        }
      } else {
        await handleLockLine(lineNumber);
      }
    } catch (error) {
      console.error('Lock/Unlock error:', error);
      const errorMessage = 'Error managing line lock. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  const handleCommentButtonClick = (lineNumber) => {
    // If a comment box is already open for this line, just toggle minimized state
    if (commentBoxConfig.isOpen && commentBoxConfig.lineNumber === lineNumber) {
      setCommentBoxConfig(prev => ({
        ...prev,
        isMinimized: !prev.isMinimized
      }));
      return;
    }
    
    // Open a new comment box for this line
    setCommentBoxConfig({
      isOpen: true,
      lineNumber,
      isMinimized: false
    });
    
    // Also select this line
    setSelectedLine(lineNumber);
  };

  const handleCloseCommentBox = () => {
    setCommentBoxConfig({
      isOpen: false,
      lineNumber: null,
      isMinimized: false
    });
  };

  const handleMinimizeCommentBox = () => {
    setCommentBoxConfig(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized
    }));
  };

  const isLineLocked = (lineNumber) => {
    return lockedLines.some(lock => lock.lineNumber === lineNumber);
  };

  const getLineLocker = (lineNumber) => {
    const lock = lockedLines.find(lock => lock.lineNumber === lineNumber);
    return lock ? lock.lockedBy : null;
  };
  
  const canUnlockLine = (lineNumber) => {
    const locker = getLineLocker(lineNumber);
    // Document owner should be able to unlock any line
    return locker && (locker.toString() === user.id.toString() || document.owner === user.id);
  };
  
  const hasCommentsForLine = (lineNumber) => {
    return comments.some(comment => comment.lineNumber === lineNumber);
  };
  
  const getLineEditClass = (lineNumber) => {
    const lineEdit = lineEdits.find(edit => edit.lineNumber === lineNumber);
    
    if (!lineEdit) return '';
    
    const isOwnerEdit = lineEdit.isOwner;
    const isCurrentUserEdit = lineEdit.editedBy === user.id;
    const isCollaboratorEdit = !isOwnerEdit && !isCurrentUserEdit;
    
    if (isCurrentUserEdit) return 'line-current-user';
    if (isOwnerEdit) return 'line-owner';
    if (isCollaboratorEdit) return 'line-collaborator';
    
    return '';
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  // Handle version history button click
  const handleVersionHistoryClick = () => {
    setShowVersionHistory(true);
  };

  // Handle version restoration from version history
  const handleVersionRestore = (version) => {
    // The version will be restored via socket event handler
    showNotification(`Restoring to version ${version.versionNumber}`, 'info');
  };

  // Handle version comparison
  const handleCompareVersions = (oldVer, newVer) => {
    setOldVersion(oldVer);
    setNewVersion(newVer);
    setCompareVersions(true);
  };

  // Handle theme analysis button click
  const handleThemeAnalysisClick = () => {
    setShowThemeAnalysis(true);
  };

  // Handle text double-click to show definitions
  const handleTextDoubleClick = (e) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    
    const text = textarea.value;
    let start, end;
    
    // Check if there's already a selection
    if (textarea.selectionStart !== textarea.selectionEnd) {
      // Use the existing selection
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
    } else {
      // Get the word at cursor position
      start = textarea.selectionStart;
      
      // Find word boundaries around the cursor position
      let wordStart = start;
      while (wordStart > 0 && /\w/.test(text[wordStart - 1])) {
        wordStart--;
      }
      
      let wordEnd = start;
      while (wordEnd < text.length && /\w/.test(text[wordEnd])) {
        wordEnd++;
      }
      
      start = wordStart;
      end = wordEnd;
    }
    
    if (end > start) {
      const word = text.substring(start, end).trim();
      if (word && word.length > 1) {
        showWordDefinition(word);
        
        // Update selection to highlight the word
        textarea.setSelectionRange(start, end);
      }
    }
  };

  // Handle mouse click in the editor to support double click detection
  const handleMouseClick = (e) => {
    // Increment the click count
    setClickCount(prevCount => prevCount + 1);
    
    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }
    
    // Set a new timeout
    const timeout = setTimeout(() => {
      if (clickCount === 1) {
        // Single click - do nothing special
      } else if (clickCount >= 2) {
        // Double click - show definition
        handleTextDoubleClick(e);
      }
      
      // Reset click count
      setClickCount(0);
    }, 300); // 300ms timeout for double click detection
    
    setClickTimeout(timeout);
  };

  // Close definition panel
  const handleCloseDefinition = () => {
    setShowDefinition(false);
    setDefinitionWord('');
  };

  // Add a method to refresh the authentication token if needed
  const refreshToken = async () => {
    try {
      console.log('Attempting to refresh authentication token');
      
      // Get the current token
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        console.error('No token available to refresh');
        return false;
      }
      
      // Call the refresh endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/refresh-token`,
        {},
        {
          headers: {
            'Authorization': currentToken.startsWith('Bearer ') ? currentToken : `Bearer ${currentToken}`
          }
        }
      );
      
      if (response.data && response.data.token) {
        console.log('Token refreshed successfully');
        
        // Save the new token
        localStorage.setItem('token', response.data.token);
        
        // Reconnect socket with the new token
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        setupSocket();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  };

  if (!isAuthenticated) {
    return (
      <Container>
        <Alert severity="error">Please log in to access the editor</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const lines = document?.content?.split('\n') || [];
  const title = document?.title || 'Untitled Document';

  const renderLineNumbers = () => {
    return (
      <Box 
        ref={lineNumbersRef}
        className="line-numbers"
        sx={{
          width: '70px',
          overflowY: 'hidden',
          backgroundColor: '#f5f5f5',
          borderRight: '1px solid #ddd',
          userSelect: 'none'
        }}
      >
        {lines.map((_, index) => {
          const isLocked = isLineLocked(index);
          const locker = getLineLocker(index);
          const isLockedByCurrentUser = locker && user.id && locker.toString() === user.id.toString();
          const hasComments = hasCommentsForLine(index);
          const lineEditClass = getLineEditClass(index);
          const isActiveLine = activeLines.includes(index);
          
          return (
            <Box
              key={index}
              className={`line-number ${lineEditClass} ${isActiveLine ? 'line-active' : ''} ${
                isLocked ? 'line-locked' : ''
              } ${hasComments ? 'line-with-comment' : ''}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                height: '24px',
                backgroundColor: selectedLine === index ? '#e3f2fd' : 'transparent',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#e3f2fd'
                }
              }}
              onClick={() => handleLineClick(index)}
            >
              <Typography
                variant="body2"
                sx={{
                  color: isLocked ? '#f44336' : '#666',
                  width: '20px',
                  textAlign: 'right',
                  fontSize: '0.8rem'
                }}
              >
                {index + 1}
              </Typography>
              
              {/* Show line actions */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title={isLocked 
                  ? (isLockedByCurrentUser ? "Unlock this line" : "Locked by another user") 
                  : "Lock this line"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLockUnlock(index);
                    }}
                    sx={{ padding: 0, mr: 0.5 }}
                  >
                    {isLocked ? (
                      <LockIcon sx={{ fontSize: '14px', color: isLockedByCurrentUser ? '#f44336' : '#999' }} />
                    ) : (
                      <LockOpenIcon sx={{ fontSize: '14px', color: '#999' }} />
                    )}
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={hasComments ? "View comments" : "Add comment"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCommentButtonClick(index);
                    }}
                    sx={{ padding: 0 }}
                  >
                    <Badge
                      variant="dot" 
                      invisible={!hasComments}
                      color="primary"
                    >
                      <CommentIcon sx={{ fontSize: '14px', color: hasComments ? '#2196f3' : '#999' }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" className="editor-container" sx={{ position: 'relative' }}>
      {/* 3D decorative elements */}
      <Box 
        sx={{
          position: 'absolute',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,118,210,0.03) 0%, rgba(25,118,210,0.02) 70%, rgba(255,255,255,0) 100%)',
          top: '10%',
          right: '-120px',
          transform: 'rotate(-15deg) translateZ(-10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <Box 
        sx={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,118,210,0.03) 0%, rgba(25,118,210,0.02) 70%, rgba(255,255,255,0) 100%)',
          bottom: '5%',
          left: '-150px',
          transform: 'rotate(15deg) translateZ(-10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : document ? (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <IconButton onClick={() => navigate('/dashboard')} color="primary">
                <ArrowBackIcon />
              </IconButton>
              <TextField
                value={document.title}
                onChange={handleTitleChange}
                variant="standard"
                InputProps={{
                  style: { fontSize: '1.5rem', fontWeight: 'bold' }
                }}
              />
            </Box>
            <Box>
              <Tooltip title="Word Definitions">
                <IconButton 
                  onClick={handleShowDefinitionClick} 
                  color={showDefinition ? "primary" : "default"}
                >
                  <MenuBookIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Run Theme Analysis">
                <IconButton onClick={handleThemeAnalysisClick} color="primary">
                  <PsychologyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="View Version History">
                <IconButton onClick={handleVersionHistoryClick} color="primary">
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={createDocumentVersion}
                sx={{ ml: 1 }}
              >
                Save Version
              </Button>
            </Box>
          </Box>

          <EnhancedPaper 
            sx={{ 
              p: 3, 
              mb: 3,
              bgcolor: 'background.paper'
            }}
            className="editor-container"
          >
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="editor-header">
              <Typography variant="h5" component="h1">
                {document.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Add a comment">
                  <IconButton
                    color="primary"
                    onClick={() => {
                      const lineNumber = activeLines[0] || selectedLine || 0;
                      handleCommentButtonClick(lineNumber);
                    }}
                    sx={{ mr: 1 }}
                  >
                    <CommentIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="AI Rhyme & Synonym Suggestions">
                  <IconButton
                    color={showRhymeSuggestions ? "primary" : "default"}
                    onClick={() => setShowRhymeSuggestions(!showRhymeSuggestions)}
                    sx={{ 
                      mr: 1,
                      backgroundColor: showRhymeSuggestions ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: showRhymeSuggestions ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                      }
                    }}
                  >
                    <AutoAwesomeIcon />
                  </IconButton>
                </Tooltip>
                {saving ? (
                  <CircularProgress size={24} sx={{ ml: 1 }} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {document.lastSaved ? `Last saved: ${new Date(document.lastSaved).toLocaleTimeString()}` : 'Not saved yet'}
                  </Typography>
                )}
              </Box>
            </Box>
            
            {/* Editor toolbar */}
            <Box 
              sx={{ 
                mb: 2, 
                display: 'flex', 
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                py: 1,
                px: 2,
                bgcolor: 'background.default',
                borderRadius: 1
              }}
            >
              <Tooltip title="Select text to get AI suggestions">
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: 'text.secondary',
                    mr: 2,
                    fontSize: '0.875rem'
                  }}
                >
                  <AutoAwesomeIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                  Pro tip: Select a word for rhyme and synonym suggestions
                </Box>
              </Tooltip>
              <Tooltip title="Double-click a word to see its definition">
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: 'text.secondary',
                    fontSize: '0.875rem'
                  }}
                >
                  <MenuBookIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                  Pro tip: Double-click any word to see its definition
                </Box>
              </Tooltip>
            </Box>
            
            <Box sx={{ display: 'flex', width: '100%', position: 'relative' }} ref={editorRef}>
              {renderLineNumbers()}
              <TextField
                multiline
                fullWidth
                variant="outlined"
                value={document?.content || ''}
                onChange={handleContentChange}
                onMouseUp={handleTextSelection} 
                onKeyUp={handleTextSelection}
                onClick={handleMouseClick}
                InputProps={{
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    lineHeight: '24px',
                    padding: 0,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    },
                    '& textarea': {
                      padding: '12px',
                      lineHeight: '24px'
                    }
                  },
                  inputRef: textAreaRef
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    padding: 0,
                    borderRadius: 0
                  }
                }}
              />
            </Box>
          </EnhancedPaper>

          {/* Display comment box if open */}
          {commentBoxConfig.isOpen && (
            <CommentBox
              documentId={id}
              lineNumber={commentBoxConfig.lineNumber}
              onClose={handleCloseCommentBox}
              onMinimize={handleMinimizeCommentBox}
              isMinimized={commentBoxConfig.isMinimized}
              socket={socketRef.current}
              lineContent={lines[commentBoxConfig.lineNumber] || ''}
            />
          )}

          {/* User cursors - disabled for now as it needs more work */}
          {/* {Object.entries(userCursors).map(([userId, data]) => (
            userId !== user.id && (
              <div 
                key={userId} 
                style={{ 
                  position: 'absolute', 
                  left: 70, // Adjust based on your line number width
                  top: data.position * 24, // 24px line height 
                  zIndex: 100 
                }}
              >
                <Tooltip title={data.name || 'Another user'}>
                  <div 
                    style={{ 
                      width: 2, 
                      height: 24, 
                      backgroundColor: '#f44336',
                      animation: 'blink 1s infinite' 
                    }} 
                  />
                </Tooltip>
              </div>
            )
          ))} */}

          {showRhymeSuggestions && selectedWord && (
            <RhymeSuggestionPanel
              selectedWord={selectedWord}
              onClose={handleCloseRhymeSuggestions}
              onSelectSuggestion={handleSelectSuggestion}
              position={{ top: 60, right: commentBoxConfig.isOpen ? 350 : 20 }}
              isVisible={showRhymeSuggestions}
            />
          )}

          {/* Definition panel */}
          {showDefinition && (
            <DefinitionPanel
              selectedWord={definitionWord}
              onClose={handleCloseDefinition}
              position={{ 
                top: 60, 
                right: commentBoxConfig.isOpen 
                  ? (showRhymeSuggestions ? 680 : 350) 
                  : (showRhymeSuggestions ? 350 : 20) 
              }}
            />
          )}

          <Snackbar
            open={notification.open}
            autoHideDuration={3000}
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleCloseNotification} 
              severity={notification.severity} 
              sx={{ width: '100%' }}
            >
              {notification.message}
            </Alert>
          </Snackbar>

          <ThemeAnalysisPanel
            documentId={id}
            isOpen={showThemeAnalysis}
            onClose={() => setShowThemeAnalysis(false)}
          />
          
          <VersionHistoryPanel
            documentId={id}
            isOpen={showVersionHistory}
            onClose={() => setShowVersionHistory(false)}
            socket={socketRef.current}
            onVersionRestore={handleVersionRestore}
            onCompareVersions={handleCompareVersions}
          />
          
          <VersionComparePanel
            documentId={id}
            isOpen={compareVersions}
            onClose={() => setCompareVersions(false)}
            oldVersion={oldVersion}
            newVersion={newVersion}
          />
        </>
      ) : null}
    </Container>
  );
};

// Helper function to get changed lines between two texts
const getChangedLines = (oldText, newText) => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const changedLines = [];
  
  const minLength = Math.min(oldLines.length, newLines.length);
  
  // Check common lines
  for (let i = 0; i < minLength; i++) {
    if (oldLines[i] !== newLines[i]) {
      changedLines.push(i);
    }
  }
  
  // If new text has more lines
  if (newLines.length > oldLines.length) {
    for (let i = oldLines.length; i < newLines.length; i++) {
      changedLines.push(i);
    }
  }
  
  return changedLines;
};

export default Editor; 