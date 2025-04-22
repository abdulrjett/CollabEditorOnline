import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tooltip,
  Collapse,
  CircularProgress,
  Fade,
  Badge
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Comment as CommentIcon,
  CheckCircle as ResolvedIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const CommentBox = ({ 
  documentId, 
  lineNumber, 
  onClose, 
  onMinimize, 
  socket,
  isMinimized,
  lineContent
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const { user } = useAuth();
  const commentListRef = useRef(null);
  const inputRef = useRef(null);
  
  // Fetch comments for this line when the component mounts
  useEffect(() => {
    fetchComments();
    
    // Set up socket event listener for new comments
    if (socket) {
      socket.on('comment-added', handleNewSocketComment);
    }
    
    return () => {
      if (socket) {
        socket.off('comment-added', handleNewSocketComment);
      }
    };
  }, [documentId, lineNumber, socket]);
  
  // Scroll to bottom of comments when new comments are added
  useEffect(() => {
    if (commentListRef.current && !isMinimized) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments, isMinimized]);

  // Focus input when comment box is expanded
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isMinimized]);
  
  const fetchComments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/comments/document/${documentId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Filter comments for this line
      const lineComments = response.data.filter(comment => 
        comment.lineNumber === lineNumber
      );
      
      setComments(lineComments);
      setError('');
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Could not load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewSocketComment = (data) => {
    if (data.lineNumber === lineNumber) {
      // Fetch the updated comments rather than trying to construct from partial socket data
      fetchComments();
    }
  };
  
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/comments`,
        {
          documentId,
          lineNumber,
          content: newComment
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Add the new comment to the list
      setComments([...comments, response.data]);
      
      // Clear the input
      setNewComment('');
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('add-comment', {
          documentId,
          lineNumber,
          content: newComment
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Could not add comment. Please try again.');
    }
  };
  
  const handleResolveComment = async (commentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/comments/${commentId}`,
        { resolved: true },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Update the comment in the list
      setComments(comments.map(comment => 
        comment._id === commentId ? response.data : comment
      ));
    } catch (error) {
      console.error('Error resolving comment:', error);
      setError('Could not resolve comment. Please try again.');
    }
  };

  const copyCommentLink = () => {
    const lineLink = `${window.location.href}#L${lineNumber + 1}`;
    navigator.clipboard.writeText(lineLink)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy line link: ', err));
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <Paper 
      elevation={3} 
      className="comment-box"
      sx={{ 
        position: 'absolute',
        right: 16,
        width: 320,
        maxHeight: isMinimized ? 48 : 400,
        transition: 'max-height 0.3s ease-in-out, box-shadow 0.3s ease',
        overflow: 'hidden',
        borderRadius: '12px',
        zIndex: 1200,
        boxShadow: isMinimized ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}
    >
      {/* Header */}
      <Box 
        className="comment-box-header"
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor: 'primary.main',
          color: 'white'
        }}
      >
        <Box display="flex" alignItems="center">
          <Badge 
            badgeContent={comments.length} 
            color="error" 
            sx={{ mr: 1 }}
          >
            <CommentIcon />
          </Badge>
          <Typography variant="subtitle2">
            Line {lineNumber + 1} Comments
          </Typography>
        </Box>
        <Box>
          <Tooltip title={linkCopied ? "Copied!" : "Copy line link"}>
            <IconButton 
              size="small" 
              onClick={copyCommentLink}
              sx={{ color: 'white', mr: 0.5 }}
            >
              <ReplyIcon sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={isMinimized ? 'Expand' : 'Minimize'}>
            <IconButton 
              size="small" 
              onClick={onMinimize}
              sx={{ color: 'white' }}
            >
              {isMinimized ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton 
              size="small" 
              onClick={onClose}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Collapse in={!isMinimized}>
        {/* Line content */}
        <Box 
          sx={{ 
            p: 1.5, 
            bgcolor: '#f5f5f5', 
            borderBottom: '1px solid #ddd',
            position: 'relative'
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              fontSize: '0.875rem',
              lineHeight: 1.6
            }}
          >
            {lineContent || '(empty line)'}
          </Typography>
          <Fade in={linkCopied}>
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                bgcolor: 'primary.light',
                color: 'white',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                fontSize: '0.75rem'
              }}
            >
              Link copied!
            </Box>
          </Fade>
        </Box>

        {/* Comments List */}
        <List
          ref={commentListRef}
          className="comment-list"
          sx={{ 
            maxHeight: 240, 
            overflowY: 'auto', 
            p: 0,
            bgcolor: '#fafafa',
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#bbb',
              borderRadius: 4,
            }
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
              <Button 
                size="small" 
                variant="text" 
                onClick={fetchComments} 
                sx={{ mt: 1 }}
              >
                Retry
              </Button>
            </Box>
          ) : comments.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No comments yet
              </Typography>
            </Box>
          ) : (
            comments.map((comment) => (
              <React.Fragment key={comment._id}>
                <ListItem 
                  alignItems="flex-start" 
                  className="animate-fade-in"
                  sx={{ 
                    pt: 1.5, 
                    pb: 1.5,
                    opacity: comment.resolved ? 0.7 : 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.02)'
                    }
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        fontSize: '0.875rem',
                        bgcolor: comment.author._id === user?.id ? 'primary.main' : 'secondary.main'
                      }}
                    >
                      {comment.author.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography 
                          variant="subtitle2" 
                          component="span"
                          sx={{
                            fontWeight: comment.author._id === user?.id ? 600 : 500,
                            color: comment.author._id === user?.id ? 'primary.main' : 'text.primary'
                          }}
                        >
                          {comment.author.name}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          {comment.resolved && (
                            <Tooltip title="Resolved">
                              <ResolvedIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                            </Tooltip>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(comment.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ 
                            display: 'block',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            mt: 0.5,
                            mb: 1,
                            color: comment.resolved ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {comment.content}
                        </Typography>
                        <Box 
                          display="flex" 
                          justifyContent="space-between" 
                          alignItems="center"
                          mt={0.5}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(comment.createdAt)}
                          </Typography>
                          {!comment.resolved && user && user.id === comment.author._id && (
                            <Button 
                              size="small" 
                              variant="text" 
                              color="primary" 
                              onClick={() => handleResolveComment(comment._id)}
                              sx={{ 
                                minWidth: 'auto', 
                                p: 0,
                                fontWeight: 500,
                                '&:hover': {
                                  bgcolor: 'transparent',
                                  textDecoration: 'underline'
                                }
                              }}
                              className="hover-lift"
                            >
                              Resolve
                            </Button>
                          )}
                        </Box>
                      </>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))
          )}
        </List>

        {/* New Comment Form */}
        <Box 
          sx={{ 
            p: 1.5, 
            display: 'flex', 
            alignItems: 'center', 
            borderTop: '1px solid #ddd',
            bgcolor: 'white'
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            inputRef={inputRef}
            multiline
            maxRows={3}
            sx={{ 
              mr: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                  }
                }
              }
            }}
          />
          <Tooltip title="Send">
            <span>
              <IconButton 
                color="primary" 
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                sx={{
                  bgcolor: newComment.trim() ? 'primary.main' : 'transparent',
                  color: newComment.trim() ? 'white' : 'action.disabled',
                  '&:hover': {
                    bgcolor: newComment.trim() ? 'primary.dark' : 'transparent'
                  }
                }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default CommentBox;
