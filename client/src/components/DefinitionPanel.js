import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  styled,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import axios from 'axios';

// Enhanced Paper with 3D effects
const EnhancedPaper = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  width: '300px',
  maxHeight: '500px',
  overflowY: 'auto',
  boxShadow: 'rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  zIndex: 1000,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '5px',
    background: 'linear-gradient(90deg, #9c27b0, #3f51b5)',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  }
}));

const DefinitionPanel = ({ selectedWord, onClose, position }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [definition, setDefinition] = useState(null);
  
  useEffect(() => {
    if (selectedWord) {
      fetchDefinition(selectedWord);
    }
  }, [selectedWord]);
  
  const fetchDefinition = async (word) => {
    if (!word) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Using the Free Dictionary API
      const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (response.data && response.data.length > 0) {
        setDefinition(response.data[0]);
      } else {
        setError('No definition found for this word.');
      }
    } catch (err) {
      setError('Could not fetch definition. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  const playAudio = (audioUrl) => {
    if (!audioUrl) return;
    
    const audio = new Audio(audioUrl);
    audio.play();
  };
  
  const formatPartOfSpeech = (pos) => {
    return pos.charAt(0).toUpperCase() + pos.slice(1);
  };
  
  const getFirstPhonetic = () => {
    if (!definition?.phonetics) return null;
    
    // Find the first phonetic with text
    const phonetic = definition.phonetics.find(p => p.text);
    return phonetic || null;
  };
  
  return (
    <Box sx={{ 
      position: 'fixed', 
      ...position,
      zIndex: 1000
    }}>
      <EnhancedPaper>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" component="h2" fontWeight="bold" color="primary">
            Word Definition
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {loading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress size={30} />
          </Box>
        ) : error ? (
          <Typography color="error" my={2}>{error}</Typography>
        ) : definition ? (
          <>
            <Box mb={1} display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h5" component="h3" fontWeight="bold">
                {definition.word}
              </Typography>
              
              {definition.phonetics && definition.phonetics.some(p => p.audio) && (
                <Tooltip title="Play pronunciation">
                  <IconButton 
                    size="small" 
                    onClick={() => playAudio(definition.phonetics.find(p => p.audio)?.audio)}
                    color="primary"
                  >
                    <VolumeUpIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            
            {getFirstPhonetic() && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {getFirstPhonetic().text}
              </Typography>
            )}
            
            <Divider sx={{ my: 1 }} />
            
            {definition.meanings && definition.meanings.map((meaning, index) => (
              <Box key={index} mb={2}>
                <Typography 
                  variant="body2" 
                  color="primary" 
                  fontWeight="bold" 
                  sx={{ fontStyle: 'italic' }}
                >
                  {formatPartOfSpeech(meaning.partOfSpeech)}
                </Typography>
                
                <List dense disablePadding>
                  {meaning.definitions.slice(0, 3).map((def, defIndex) => (
                    <ListItem key={defIndex} sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={
                          <Typography variant="body2">
                            <Box component="span" fontWeight="medium">{defIndex + 1}.</Box> {def.definition}
                          </Typography>
                        }
                        secondary={def.example && (
                          <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                            "{def.example}"
                          </Typography>
                        )}
                      />
                    </ListItem>
                  ))}
                </List>
                
                {meaning.synonyms && meaning.synonyms.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="caption" color="textSecondary">
                      <strong>Synonyms:</strong> {meaning.synonyms.slice(0, 5).join(', ')}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Select a word to see its definition
          </Typography>
        )}
      </EnhancedPaper>
    </Box>
  );
};

export default DefinitionPanel; 