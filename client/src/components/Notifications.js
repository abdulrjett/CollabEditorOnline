import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Divider,
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Fade,
  Chip,
  useTheme
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Description as DescriptionIcon,
  Share as ShareIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Comment as CommentIcon,
  NotificationsOff as NotificationsOffIcon,
  NotificationsActive as NotificationsActiveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const open = Boolean(anchorEl);
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const notificationListRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setNotifications(response.data);
      setUnreadCount(response.data.filter(notification => !notification.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleClick = (event) => {
    refreshNotifications(); // Refresh notifications when opening menu
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read
      if (!notification.read) {
        const token = localStorage.getItem('token');
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/notifications/${notification._id}/read`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        setNotifications(prevNotifications => 
          prevNotifications.map(n => 
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
        
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
      
      // Navigate to document if it's a document notification
      if (notification.document) {
        navigate(`/editor/${notification.document}`);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/notifications/mark-all-read`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'DOCUMENT_SHARED':
        return <ShareIcon sx={{ color: theme.palette.info.main }} />;
      case 'DOCUMENT_UPDATED':
        return <DescriptionIcon sx={{ color: theme.palette.success.main }} />;
      case 'COMMENT_ADDED':
        return <CommentIcon sx={{ color: theme.palette.warning.main }} />;
      default:
        return <PersonIcon sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'DOCUMENT_SHARED':
        return theme.palette.info.light;
      case 'DOCUMENT_UPDATED':
        return theme.palette.success.light;
      case 'COMMENT_ADDED':
        return theme.palette.warning.light;
      default:
        return theme.palette.grey[200];
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return notificationTime.toLocaleDateString();
  };

  const groupNotificationsByDate = () => {
    const groups = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
    });
    
    return groups;
  };

  const getHeaderForDate = (dateString) => {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toLocaleDateString();
    
    if (dateString === today) return 'Today';
    if (dateString === yesterdayString) return 'Yesterday';
    return dateString;
  };

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}>
        <IconButton
          onClick={handleClick}
          size="medium"
          aria-controls={open ? 'notifications-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          color="inherit"
          className={unreadCount > 0 ? "animate-pulse" : ""}
          sx={{ 
            position: 'relative',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.1)' }
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                height: 18,
                minWidth: 18,
                padding: '0 4px'
              }
            }}
          >
            <NotificationsIcon color={unreadCount > 0 ? "primary" : "action"} />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.15))',
            mt: 1.5,
            width: 360,
            maxHeight: 480,
            borderRadius: 2,
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
        TransitionComponent={Fade}
        transitionDuration={200}
      >
        <Box 
          sx={{ 
            px: 2, 
            py: 1.5, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
          }}
        >
          <Box display="flex" alignItems="center">
            <NotificationsActiveIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Notifications
              {unreadCount > 0 && (
                <Chip 
                  size="small" 
                  label={unreadCount} 
                  color="primary" 
                  sx={{ ml: 1, height: 20, fontSize: '0.75rem' }} 
                />
              )}
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Refresh">
              <IconButton 
                size="small" 
                onClick={refreshNotifications}
                disabled={refreshing}
                sx={{ mr: 0.5 }}
              >
                <RefreshIcon 
                  fontSize="small" 
                  sx={{ 
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} 
                />
              </IconButton>
            </Tooltip>
            {unreadCount > 0 && (
              <Button 
                size="small" 
                onClick={handleMarkAllAsRead}
                startIcon={<CheckCircleIcon fontSize="small" />}
                sx={{ fontWeight: 500 }}
              >
                Mark all read
              </Button>
            )}
          </Box>
        </Box>
        
        {loading && !refreshing ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={28} thickness={4} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading notifications...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small" 
              onClick={refreshNotifications}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsOffIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              No notifications
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              When you receive notifications, they'll appear here
            </Typography>
          </Box>
        ) : (
          <List 
            ref={notificationListRef}
            sx={{ 
              width: '100%', 
              bgcolor: 'background.paper', 
              p: 0,
              maxHeight: 380,
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: 8,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#bbb',
                borderRadius: 4,
              }
            }}
          >
            {Object.entries(groupNotificationsByDate()).map(([date, dateNotifications]) => (
              <React.Fragment key={date}>
                <Box 
                  sx={{ 
                    px: 2, 
                    py: 0.5, 
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <TimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', opacity: 0.7 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {getHeaderForDate(date)}
                  </Typography>
                </Box>
                {dateNotifications.map((notification) => (
                  <ListItem 
                    key={notification._id}
                    alignItems="flex-start" 
                    button 
                    onClick={() => handleNotificationClick(notification)}
                    sx={{ 
                      px: 2,
                      py: 1.5,
                      transition: 'all 0.2s',
                      position: 'relative',
                      backgroundColor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.05)',
                      '&:hover': {
                        backgroundColor: notification.read ? 'action.hover' : 'rgba(25, 118, 210, 0.1)',
                      },
                      '&::after': !notification.read ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 4,
                        height: '70%',
                        backgroundColor: 'primary.main',
                        borderRadius: '0 4px 4px 0'
                      } : {}
                    }}
                    className={notification.read ? '' : 'animate-fade-in'}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{ 
                          bgcolor: getNotificationColor(notification.type),
                          color: 'white'
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          component="span"
                          variant="body1"
                          sx={{ 
                            fontWeight: notification.read ? 500 : 600,
                            color: notification.read ? 'text.primary' : 'primary.main',
                            mb: 0.5,
                            display: 'block'
                          }}
                        >
                          {notification.type === 'DOCUMENT_SHARED' 
                            ? 'Document Shared with You' 
                            : notification.type === 'DOCUMENT_UPDATED'
                              ? 'Document Updated'
                              : notification.type === 'COMMENT_ADDED'
                                ? 'New Comment'
                                : 'Notification'}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            display="block"
                            sx={{ 
                              mb: 0.5,
                              lineHeight: 1.4,
                              fontWeight: notification.read ? 'normal' : 500
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'flex', alignItems: 'center' }}
                          >
                            <TimeIcon sx={{ fontSize: 14, mr: 0.5, opacity: 0.7 }} />
                            {getTimeAgo(notification.createdAt)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </React.Fragment>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
};

export default Notifications; 