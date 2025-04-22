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
  Chip,
  Divider,
  IconButton,
  Alert,
  LinearProgress,
  Snackbar,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

// Custom colors for themes
const THEME_COLORS = [
  '#8884d8', // Purple
  '#82ca9d', // Green
  '#ffc658', // Yellow
  '#ff8042', // Orange
  '#0088FE', // Blue
];

// Custom colors for genres
const GENRE_COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Teal
  '#FFBB28', // Yellow
  '#FF8042', // Orange
];

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

const ThemeAnalysisPanel = ({ 
  documentId, 
  isOpen, 
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  useEffect(() => {
    if (isOpen && documentId) {
      fetchAnalysis();
    }
  }, [isOpen, documentId]);
  
  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/analysis/document/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      if (error.response && error.response.status === 404) {
        // No analysis yet - this is not an error state
        setAnalysis(null);
      } else {
        setError('Failed to load analysis. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
  
  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError('');
      
      showNotification('Analyzing your document content using AI zero-shot classification...', 'info');
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/analysis/document/${documentId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setAnalysis(response.data);
      showNotification('Analysis completed successfully with enhanced AI accuracy!', 'success');
    } catch (error) {
      console.error('Error running analysis:', error);
      setError('Failed to analyze document. Please try again.');
      showNotification('Analysis failed. Please try again.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Unknown date';
    }
  };
  
  // Format data for pie charts
  const prepareChartData = (items) => {
    return items.filter(item => item.score > 0).map(item => ({
      name: item.name,
      value: item.score
    }));
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Theme & Genre Analysis</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ 
        background: 'linear-gradient(to bottom, #f8f9fa, #ffffff)',
        p: { xs: 2, md: 3 }
      }}>
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
              Loading analysis data...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : !analysis ? (
          <Box textAlign="center" p={3}>
            <Typography variant="body1" gutterBottom>
              No analysis has been performed yet for this document.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={runAnalysis}
              disabled={analyzing}
              startIcon={<AnalyticsIcon />}
              sx={{ mt: 2 }}
            >
              Run Analysis
            </Button>
            {analyzing && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Analyzing document content...
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            <Box textAlign="right" mb={2}>
              <Typography variant="body2" color="textSecondary">
                Last analyzed: {formatDate(analysis.analyzedAt)}
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={runAnalysis}
                disabled={analyzing}
                startIcon={<AnalyticsIcon />}
                sx={{ mt: 1 }}
              >
                Analyze Again
              </Button>
              {analyzing && <LinearProgress sx={{ mt: 1 }} />}
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Document Themes
              <Tooltip title="Themes are analyzed using advanced AI zero-shot classification for maximum accuracy.">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <Box height={330} mb={4} sx={{ 
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: '10%',
                right: '10%',
                height: '1px',
                background: 'radial-gradient(circle, rgba(0,0,0,0.1) 0%, rgba(255,255,255,0) 80%)'
              }
            }}>
              <EnhancedPaper sx={{ 
                p: 3, 
                height: '100%',
                background: 'linear-gradient(145deg, #ffffff, #f5f8ff)'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareChartData(analysis.themes)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={1500}
                      animationBegin={300}
                    >
                      {prepareChartData(analysis.themes).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={THEME_COLORS[index % THEME_COLORS.length]} 
                          strokeWidth={2}
                          stroke="#ffffff"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `${value}%`} />
                    <Legend 
                      verticalAlign="bottom" 
                      iconType="circle" 
                      iconSize={10} 
                      height={36}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </EnhancedPaper>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Document Genre
              <Tooltip title="Genres are determined using AI classification and structural text analysis.">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <Box height={300} mb={4}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prepareChartData(analysis.genres)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {prepareChartData(analysis.genres).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GENRE_COLORS[index % GENRE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Key Terms
            </Typography>
            
            <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
              {analysis.keywords.map((keyword, index) => (
                <Chip 
                  key={index} 
                  label={keyword} 
                  color="primary" 
                  variant="outlined" 
                  sx={{
                    borderRadius: '16px',
                    transition: 'all 0.2s',
                    fontWeight: 'medium',
                    '&:hover': {
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                      transform: 'translateY(-2px)',
                      backgroundColor: 'rgba(25, 118, 210, 0.08)'
                    }
                  }}
                />
              ))}
            </Box>
            
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
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
    </Dialog>
  );
};

export default ThemeAnalysisPanel; 