import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Tooltip
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import CompareIcon from '@mui/icons-material/Compare';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

// Custom 3D Paper component
const EnhancedPaper = ({ children, ...props }) => (
  <Paper 
    {...props} 
    elevation={3}
    sx={{ 
      ...props.sx,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 2,
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        transform: 'translateY(-2px)'
      }
    }}
  >
    {children}
  </Paper>
);

const VersionHistoryPanel = ({ 
  documentId, 
  isOpen, 
  onClose, 
  socket, 
  onVersionRestore,
  onCompareVersions 
}) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState([]);
  
  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions();
    }
  }, [isOpen, documentId]);
  
  useEffect(() => {
    if (socket) {
      socket.on('version-created', (data) => {
        if (data.documentId === documentId) {
          // Add the new version to the list
          setVersions(prevVersions => [data.versionData, ...prevVersions]);
        }
      });
      
      return () => {
        socket.off('version-created');
      };
    }
  }, [socket, documentId]);
  
  const fetchVersions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/versions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Sort versions by version number (descending)
      const sortedVersions = response.data.sort((a, b) => b.versionNumber - a.versionNumber);
      setVersions(sortedVersions);
    } catch (error) {
      console.error('Error fetching versions:', error);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRestoreVersion = async (version) => {
    setSelectedVersion(version);
    
    if (socket) {
      socket.emit('restore-version', {
        documentId,
        versionNumber: version.versionNumber
      });
    }
    
    if (onVersionRestore) {
      onVersionRestore(version);
    }
    
    setSelectedVersion(null);
  };
  
  const handleToggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    setCompareVersions([]);
  };
  
  const handleSelectForComparison = (version) => {
    if (compareVersions.some(v => v.versionNumber === version.versionNumber)) {
      // Remove from selection
      setCompareVersions(compareVersions.filter(v => v.versionNumber !== version.versionNumber));
    } else {
      // Add to selection (max 2)
      if (compareVersions.length < 2) {
        setCompareVersions([...compareVersions, version]);
      }
    }
  };
  
  const handleCompareSelected = () => {
    if (compareVersions.length === 2 && onCompareVersions) {
      // Sort by version number
      const sortedVersions = [...compareVersions].sort((a, b) => a.versionNumber - b.versionNumber);
      onCompareVersions(sortedVersions[0], sortedVersions[1]);
      setComparisonMode(false);
      setCompareVersions([]);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(to right, #1976d2, #42a5f5)',
        color: 'white',
        position: 'relative'
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Version History</Typography>
          <Box>
            <Tooltip title={comparisonMode ? "Cancel comparison" : "Compare versions"}>
              <IconButton 
                onClick={handleToggleComparisonMode}
                sx={{
                  color: comparisonMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white'
                  }
                }}
              >
                <CompareIcon />
              </IconButton>
            </Tooltip>
            <IconButton 
              onClick={onClose}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ 
        background: 'linear-gradient(to bottom, #f8f9fa, #ffffff)',
        p: { xs: 2, md: 3 }
      }}>
        {comparisonMode && (
          <Box mb={2} p={2} bgcolor="background.level1" borderRadius={1}>
            <Typography variant="body2">
              Select two versions to compare. {compareVersions.length}/2 selected.
            </Typography>
            {compareVersions.length === 2 && (
              <Button 
                variant="contained" 
                color="primary" 
                size="small" 
                onClick={handleCompareSelected}
                startIcon={<CompareIcon />}
                sx={{ mt: 1 }}
              >
                Compare Versions
              </Button>
            )}
          </Box>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" p={4} height="300px">
            <CircularProgress 
              size={60} 
              thickness={4} 
              sx={{ 
                color: 'primary.main',
                boxShadow: '0 0 20px rgba(25, 118, 210, 0.2)',
                borderRadius: '50%',
                p: 1
              }} 
            />
            <Typography variant="body1" color="textSecondary" sx={{ mt: 2, fontWeight: 'medium' }}>
              Loading version history...
            </Typography>
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : versions.length === 0 ? (
          <Typography>No version history available.</Typography>
        ) : (
          <List>
            {versions.map((version, index) => (
              <React.Fragment key={version.versionNumber}>
                {index > 0 && <Divider component="li" />}
                <ListItem 
                  button={comparisonMode}
                  onClick={comparisonMode ? () => handleSelectForComparison(version) : undefined}
                  selected={comparisonMode && compareVersions.some(v => v.versionNumber === version.versionNumber)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      transform: 'translateX(4px)'
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.15)',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.2)',
                      }
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="subtitle1">
                          Version {version.versionNumber}
                        </Typography>
                        {version.description && (
                          <Tooltip title={version.description}>
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="textSecondary">
                          {version.author?.name || 'Unknown'} - {formatDate(version.timestamp)}
                        </Typography>
                      </>
                    }
                  />
                  {!comparisonMode && (
                    <ListItemSecondaryAction>
                      <Tooltip title="Restore this version">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRestoreVersion(version)}
                          disabled={selectedVersion?.versionNumber === version.versionNumber}
                          sx={{
                            color: 'primary.main',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.08)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          {selectedVersion?.versionNumber === version.versionNumber ? (
                            <CircularProgress size={24} />
                          ) : (
                            <RestoreIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              </React.Fragment>
            ))}
          </List>
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

export default VersionHistoryPanel; 