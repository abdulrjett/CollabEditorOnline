import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as DocumentIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Notifications from './Notifications';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    handleMenuClose();
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const navigateTo = (path) => {
    handleMenuClose();
    setMobileMenuOpen(false);
    navigate(path);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{ 
        backgroundColor: 'white', 
        color: 'text.primary',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'primary.main',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            '&:hover': {
              color: 'primary.dark'
            }
          }}
        >
          <DocumentIcon sx={{ mr: 1 }} />
          Collaborative Editor
        </Typography>

        {isMobile ? (
          <>
            {isAuthenticated && <Notifications />}
            <IconButton 
              color="inherit" 
              onClick={handleMobileMenuToggle}
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Drawer
              anchor="right"
              open={mobileMenuOpen}
              onClose={handleMobileMenuToggle}
              PaperProps={{
                sx: { width: '70%', maxWidth: 300, pt: 2 }
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  px: 2,
                  mb: 2
                }}
              >
                <IconButton onClick={handleMobileMenuToggle}>
                  <CloseIcon />
                </IconButton>
              </Box>

              {isAuthenticated ? (
                <>
                  <Box sx={{ px: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main', 
                        width: 40, 
                        height: 40,
                        mr: 1.5
                      }}
                    >
                      {getInitials(user?.name)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {user?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user?.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <List>
                    <ListItem 
                      button 
                      onClick={() => navigateTo('/')}
                      sx={{ 
                        backgroundColor: isActive('/') ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                        color: isActive('/') ? 'primary.main' : 'text.primary'
                      }}
                    >
                      <ListItemIcon>
                        <DashboardIcon color={isActive('/') ? 'primary' : 'inherit'} />
                      </ListItemIcon>
                      <ListItemText primary="Dashboard" />
                    </ListItem>
                    <ListItem button onClick={handleLogout}>
                      <ListItemIcon>
                        <LogoutIcon />
                      </ListItemIcon>
                      <ListItemText primary="Logout" />
                    </ListItem>
                  </List>
                </>
              ) : (
                <List>
                  <ListItem 
                    button 
                    onClick={() => navigateTo('/login')}
                    sx={{ 
                      backgroundColor: isActive('/login') ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                      color: isActive('/login') ? 'primary.main' : 'text.primary'
                    }}
                  >
                    <ListItemIcon>
                      <PersonIcon color={isActive('/login') ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Login" />
                  </ListItem>
                  <ListItem 
                    button 
                    onClick={() => navigateTo('/register')}
                    sx={{ 
                      backgroundColor: isActive('/register') ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                      color: isActive('/register') ? 'primary.main' : 'text.primary'
                    }}
                  >
                    <ListItemIcon>
                      <PersonIcon color={isActive('/register') ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="Register" />
                  </ListItem>
                </List>
              )}
            </Drawer>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isAuthenticated ? (
              <>
                <Button 
                  component={RouterLink} 
                  to="/" 
                  color={isActive('/') ? 'primary' : 'inherit'}
                  sx={{ 
                    mr: 1,
                    fontWeight: isActive('/') ? 600 : 500,
                    backgroundColor: isActive('/') ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive('/') ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                  startIcon={<DashboardIcon />}
                >
                  Dashboard
                </Button>
                
                <Notifications />
                
                <Tooltip title={user?.name || 'User'}>
                  <IconButton 
                    onClick={handleProfileMenuOpen}
                    sx={{ ml: 1 }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main', 
                        width: 32, 
                        height: 32,
                        fontSize: '0.875rem',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      {getInitials(user?.name)}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      minWidth: 200,
                      mt: 1.5,
                      borderRadius: 2,
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {user?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => navigateTo('/')} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <DashboardIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" />
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  variant={isActive('/login') ? 'contained' : 'text'}
                  color="primary"
                  component={RouterLink}
                  to="/login"
                  sx={{ mr: 1 }}
                >
                  Login
                </Button>
                <Button
                  variant={isActive('/register') ? 'contained' : 'outlined'}
                  color="primary"
                  component={RouterLink}
                  to="/register"
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 