import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as MagicIcon,
  Refresh as RefreshIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  MusicNote as RhymeIcon,
  Psychology as SynonymIcon
} from '@mui/icons-material';
import axios from 'axios';

const RhymeSuggestionPanel = ({ 
  selectedWord, 
  onClose, 
  onSelectSuggestion,
  position = { top: 60, right: 20 },
  isVisible = true
}) => {
  const [suggestions, setSuggestions] = useState({ rhymes: [], synonyms: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({ rhymes: true, synonyms: true });
  const theme = useTheme();

  useEffect(() => {
    if (selectedWord && isVisible) {
      fetchSuggestions(selectedWord);
    }
  }, [selectedWord, isVisible]);

  const fetchSuggestions = async (word) => {
    if (!word || word.trim() === '') return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/nlp/rhymes`, 
        {
          params: { word },
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 5000  // Add a timeout to avoid long waits
        }
      );
      
      if (response.data.success) {
        setSuggestions(response.data.data);
      } else {
        setError('Could not fetch suggestions.');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      
      // More detailed error message based on error type
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. NLP server might be slow or unavailable.');
      } else if (!navigator.onLine) {
        setError('You are offline. Please check your internet connection.');
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(`Server error: ${error.response.status}. Please try again.`);
      } else if (error.request) {
        // The request was made but no response was received
        setError('NLP service is unavailable. Please try again later or check if the server is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('Failed to load suggestions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedWord) {
      fetchSuggestions(selectedWord);
    }
  };

  const toggleExpanded = (section) => {
    setExpanded({
      ...expanded,
      [section]: !expanded[section]
    });
  };

  const handleSuggestionClick = (word) => {
    if (onSelectSuggestion) {
      onSelectSuggestion(word);
    }
  };

  if (!isVisible) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        width: 280,
        maxHeight: 500,
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 1000,
        ...position,
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}
      className="rhyme-suggestion-panel"
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'white',
          p: 1.5,
        }}
      >
        <Box display="flex" alignItems="center">
          <MagicIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Suggestions for "{selectedWord}"
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 0, maxHeight: 440, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="error" variant="body2" gutterBottom>
              {error}
            </Typography>
            <IconButton onClick={handleRefresh} size="small" color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        ) : (
          <>
            {/* Rhymes Section */}
            <Box 
              sx={{ 
                bgcolor: 'background.paper',
                borderBottom: expanded.rhymes ? 'none' : `1px solid ${theme.palette.divider}`
              }}
            >
              <Box
                onClick={() => toggleExpanded('rhymes')}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Box display="flex" alignItems="center">
                  <RhymeIcon sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Rhyming Words
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  {suggestions.rhymes?.length > 0 && (
                    <Chip 
                      size="small" 
                      label={suggestions.rhymes.length} 
                      sx={{ mr: 1, height: 20, fontSize: '0.75rem' }} 
                    />
                  )}
                  {expanded.rhymes ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
              </Box>
              
              <Collapse in={expanded.rhymes}>
                <List dense disablePadding>
                  {suggestions.rhymes?.length > 0 ? (
                    suggestions.rhymes.map((rhyme, index) => (
                      <ListItem 
                        key={`rhyme-${index}`}
                        button 
                        onClick={() => handleSuggestionClick(rhyme)}
                        sx={{ 
                          pl: 4,
                          py: 0.75,
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                          }
                        }}
                      >
                        <ListItemText 
                          primary={rhyme} 
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            sx: { fontWeight: 500 }
                          }} 
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem sx={{ pl: 4, py: 1 }}>
                      <ListItemText
                        primary="No rhymes found"
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'text.secondary',
                          sx: { fontStyle: 'italic' }
                        }}
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </Box>

            {/* Synonyms Section */}
            <Box sx={{ bgcolor: 'background.paper' }}>
              <Box
                onClick={() => toggleExpanded('synonyms')}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Box display="flex" alignItems="center">
                  <SynonymIcon sx={{ color: 'secondary.main', mr: 1 }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Synonyms
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  {suggestions.synonyms?.length > 0 && (
                    <Chip 
                      size="small"
                      color="secondary" 
                      label={suggestions.synonyms.length} 
                      sx={{ mr: 1, height: 20, fontSize: '0.75rem' }} 
                    />
                  )}
                  {expanded.synonyms ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
              </Box>
              
              <Collapse in={expanded.synonyms}>
                <List dense disablePadding>
                  {suggestions.synonyms?.length > 0 ? (
                    suggestions.synonyms.map((synonym, index) => (
                      <ListItem 
                        key={`synonym-${index}`}
                        button 
                        onClick={() => handleSuggestionClick(synonym)}
                        sx={{ 
                          pl: 4,
                          py: 0.75,
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: 'rgba(220, 0, 78, 0.08)',
                          }
                        }}
                      >
                        <ListItemText 
                          primary={synonym} 
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            sx: { fontWeight: 500 }
                          }} 
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem sx={{ pl: 4, py: 1 }}>
                      <ListItemText
                        primary="No synonyms found"
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'text.secondary',
                          sx: { fontStyle: 'italic' }
                        }}
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </Box>
            
            {/* Footer */}
            <Box
              sx={{
                p: 1,
                display: 'flex',
                justifyContent: 'center',
                borderTop: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper'
              }}
            >
              <Tooltip title="Refresh suggestions">
                <IconButton onClick={handleRefresh} size="small" color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default RhymeSuggestionPanel; 