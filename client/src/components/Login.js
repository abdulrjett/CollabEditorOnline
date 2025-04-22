import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      // Show success notification
      setNotification({
        open: true,
        message: 'Login successful! Redirecting...',
        severity: 'success'
      });
      // Navigate after showing notification
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid email or password');
      // Show error notification
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Invalid email or password',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper 
          elevation={6} 
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(to bottom right, #ffffff, #f7f9fc)',
            borderRadius: 2,
            width: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* 3D decorative elements */}
          <Box 
            sx={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(25,118,210,0.1) 0%, rgba(25,118,210,0.05) 70%, rgba(255,255,255,0) 100%)',
              top: '-50px',
              right: '-50px',
              transform: 'rotate(-15deg)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              zIndex: 0
            }}
          />
          <Box 
            sx={{
              position: 'absolute',
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(25,118,210,0.1) 0%, rgba(25,118,210,0.05) 70%, rgba(255,255,255,0) 100%)',
              bottom: '-80px',
              left: '-70px',
              transform: 'rotate(15deg)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              zIndex: 0
            }}
          />
          
          <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
            Sign In
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%', position: 'relative', zIndex: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ 
                mt: 2, 
                mb: 2, 
                py: 1.5,
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #156cb8 30%, #2196f3 90%)',
                }
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Grid container justifyContent="center">
              <Grid item>
                <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                  Don't have an account?{' '}
                  <Button 
                    onClick={() => navigate('/register')} 
                    sx={{ p: 0, minWidth: 'auto', textTransform: 'none', fontWeight: 'bold' }}
                  >
                    Sign Up
                  </Button>
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
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
    </Container>
  );
};

export default Login; 