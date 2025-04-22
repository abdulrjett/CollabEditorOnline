import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';
import axios from 'axios';

// A simple diff viewer component that highlights additions and deletions
const DiffViewer = ({ oldText, newText }) => {
  const [diffContent, setDiffContent] = useState([]);
  
  useEffect(() => {
    // Simple diff view - splitting by lines and comparing
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    
    const diff = [];
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = i < oldLines.length ? oldLines[i] : null;
      const newLine = i < newLines.length ? newLines[i] : null;
      
      if (oldLine === newLine) {
        // Unchanged line
        diff.push({ type: 'unchanged', content: oldLine });
      } else {
        // Line changed
        if (oldLine !== null) {
          diff.push({ type: 'removed', content: oldLine });
        }
        if (newLine !== null) {
          diff.push({ type: 'added', content: newLine });
        }
      }
    }
    
    setDiffContent(diff);
  }, [oldText, newText]);
  
  return (
    <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '500px' }}>
      {diffContent.map((line, index) => (
        <Box 
          key={index} 
          py={0.5} 
          px={1}
          sx={{
            backgroundColor: line.type === 'added' ? 'rgba(0, 255, 0, 0.1)' : 
                             line.type === 'removed' ? 'rgba(255, 0, 0, 0.1)' : 
                             'transparent',
            borderLeft: line.type === 'added' ? '3px solid green' : 
                        line.type === 'removed' ? '3px solid red' : 
                        '3px solid transparent'
          }}
        >
          {line.content}
        </Box>
      ))}
    </Box>
  );
};

const VersionComparePanel = ({ 
  documentId, 
  isOpen, 
  onClose, 
  oldVersion, 
  newVersion 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [oldContent, setOldContent] = useState('');
  const [newContent, setNewContent] = useState('');
  
  useEffect(() => {
    if (isOpen && documentId && oldVersion && newVersion) {
      fetchVersionContents();
    }
  }, [isOpen, documentId, oldVersion, newVersion]);
  
  const fetchVersionContents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch the old version
      const oldVersionResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/versions/${oldVersion.versionNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Fetch the new version
      const newVersionResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/versions/${newVersion.versionNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setOldContent(oldVersionResponse.data.content);
      setNewContent(newVersionResponse.data.content);
    } catch (error) {
      console.error('Error fetching version contents:', error);
      setError('Failed to load version contents for comparison');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Compare Versions</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Paper sx={{ p: 2, flex: 1, mr: 1 }}>
                <Typography variant="subtitle1">
                  Version {oldVersion?.versionNumber}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {oldVersion?.author?.name || 'Unknown'} - {formatDate(oldVersion?.timestamp)}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, ml: 1 }}>
                <Typography variant="subtitle1">
                  Version {newVersion?.versionNumber}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {newVersion?.author?.name || 'Unknown'} - {formatDate(newVersion?.timestamp)}
                </Typography>
              </Paper>
            </Box>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <DiffViewer oldText={oldContent} newText={newContent} />
            </Paper>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VersionComparePanel; 