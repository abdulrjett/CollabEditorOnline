import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SharedDocument = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocument();
  }, [token]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/documents/shared/${token}`);
      setDocument(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching shared document:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setError('This sharing link has expired or is invalid.');
        } else {
          setError('Error loading document. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/editor/${document._id}`);
      return;
    }
    navigate(`/editor/${document._id}`);
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 5 }}>
          <Alert severity="error">{error}</Alert>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 5 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Shared Document
          </Typography>
          <Typography variant="h5" gutterBottom>
            {document.title}
          </Typography>
          <Typography variant="body1" paragraph>
            You've been invited to collaborate on this document.
          </Typography>
          
          {!isAuthenticated ? (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please log in to access this shared document.
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/login?redirect=/editor/${document._id}`)}
                fullWidth
                sx={{ mb: 2 }}
              >
                Log In
              </Button>
              <Typography variant="body2" align="center">
                Don't have an account?{' '}
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={() => navigate(`/register?redirect=/editor/${document._id}`)}
                >
                  Register here
                </Link>
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpen}
                size="large"
              >
                Open Document
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default SharedDocument; 