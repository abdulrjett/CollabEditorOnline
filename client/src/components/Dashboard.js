import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Tooltip,
  Chip,
  InputAdornment,
  Paper,
  Avatar,
  Divider,
  CircularProgress,
  Tab,
  Tabs,
  CardHeader,
  CardMedia,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Link as LinkIcon,
  Check as CheckIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const Dashboard = () => {
  const theme = useTheme();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newDocument, setNewDocument] = useState({ title: '' });
  const [shareDialog, setShareDialog] = useState({ 
    open: false, 
    documentId: null,
    documentTitle: '',
    email: '', 
    shareLink: '',
    message: '',
    loading: false
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [currentTab, setCurrentTab] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDocuments(response.data);
      setError('');
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Error loading documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      if (!newDocument.title.trim()) {
        setError('Document title is required');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/documents`, 
        newDocument,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setDocuments([...documents, response.data]);
      setOpenDialog(false);
      setNewDocument({ title: '' });
      navigate(`/editor/${response.data._id}`);
    } catch (error) {
      console.error('Error creating document:', error);
      setError('Error creating document. Please try again.');
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setDocuments(documents.filter(doc => doc._id !== id));
      showNotification('Document deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification('Error deleting document', 'error');
    }
  };

  const handleOpenShareDialog = async (documentId) => {
    try {
      // Find the document
      const document = documents.find(doc => doc._id === documentId);
      
      setShareDialog({ 
        open: true, 
        documentId, 
        documentTitle: document.title,
        email: '', 
        shareLink: document.shareLink || '',
        message: `${user.name} is sharing the document "${document.title}" with you.`,
        loading: false
      });
      
      // If we don't have a share link yet, generate one
      if (!document.shareLink) {
        await generateShareLink(documentId);
      }
    } catch (error) {
      console.error('Error opening share dialog:', error);
      showNotification('Error preparing document for sharing', 'error');
    }
  };

  const generateShareLink = async (documentId) => {
    try {
      setShareDialog(prev => ({...prev, loading: true}));
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/share`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data && response.data.shareLink) {
        setShareDialog(prev => ({
          ...prev,
          shareLink: response.data.shareLink,
          loading: false
        }));
        
        // Update the document in our local state with the share link
        setDocuments(prevDocs => prevDocs.map(doc => 
          doc._id === documentId 
            ? { ...doc, shareLink: response.data.shareLink } 
            : doc
        ));
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      showNotification('Error generating share link', 'error');
      setShareDialog(prev => ({...prev, loading: false}));
    }
  };

  const handleShareDocument = async () => {
    try {
      if (shareDialog.email && !isValidEmail(shareDialog.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }

      setShareDialog(prev => ({...prev, loading: true}));
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/documents/${shareDialog.documentId}/share`,
        {
          email: shareDialog.email,
          message: shareDialog.message
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Handle different response scenarios
      if (response.data.emailNotRegistered) {
        showNotification('User not found. Share link copied to clipboard.', 'warning');
        copyToClipboard(response.data.shareLink);
      } else if (response.data.sharedWith) {
        showNotification(`Document shared with ${response.data.sharedWith.name || response.data.sharedWith.email}`, 'success');
        fetchDocuments(); // Refresh documents to update collaborators
      } else {
        showNotification('Share link generated and copied to clipboard', 'success');
        copyToClipboard(response.data.shareLink);
      }
      
      setShareDialog({ 
        open: false, 
        documentId: null,
        documentTitle: '',
        email: '', 
        shareLink: '', 
        message: '',
        loading: false
      });
    } catch (error) {
      console.error('Error sharing document:', error);
      setShareDialog(prev => ({...prev, loading: false}));
      
      if (error.response?.data?.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Error sharing document. Please try again.', 'error');
      }
    }
  };

  const handleCopyShareLink = () => {
    copyToClipboard(shareDialog.shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
    showNotification('Share link copied to clipboard', 'success');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .catch(err => console.error('Could not copy text: ', err));
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  const getDocumentInitials = (title) => {
    if (!title) return 'D';
    const words = title.split(' ');
    if (words.length === 1) return title.substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };
  
  const getRandomColor = (title) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      '#00796b', // teal
      '#e91e63', // pink
      '#9c27b0', // purple
      '#673ab7', // deep purple
      '#3f51b5', // indigo
      '#2196f3', // blue
      '#f44336', // red
      '#ff9800'  // orange
    ];
    
    let sum = 0;
    for (let i = 0; i < title.length; i++) {
      sum += title.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  const filteredDocuments = currentTab === 0 
    ? documents 
    : currentTab === 1 
      ? documents.filter(doc => doc.owner === user?.id) 
      : documents.filter(doc => doc.owner !== user?.id);

  const handleOpenAdaptiveEditorDemo = () => {
    navigate('/adaptive-editor-demo');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '150px',
            height: '150px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '0 0 0 150px',
            zIndex: 0
          }}
        />
        <Box position="relative" zIndex={1}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            My Documents
          </Typography>
          <Typography variant="subtitle1">
            Create, edit, and collaborate on documents in real-time
          </Typography>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ mt: 2, fontWeight: 'bold', borderRadius: 2 }}
          >
            Create New Document
          </Button>
        </Box>
      </Paper>

      {/* Feature Card for Adaptive Editor Demo */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Try Our New Adaptive Text Formatting Editor
            </Typography>
            <Typography variant="body1" paragraph>
              Experience advanced text formatting with our new Quill.js-based editor. Paste content from Word, websites, and more while preserving formatting.
            </Typography>
            <Button 
              variant="contained" 
              color="secondary"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleOpenAdaptiveEditorDemo}
              sx={{ 
                bgcolor: 'white', 
                color: '#2196F3',
                '&:hover': { bgcolor: '#e3f2fd', color: '#1565c0' } 
              }}
            >
              Try Adaptive Editor Demo
            </Button>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: '#ffffff40', 
                  margin: '0 auto',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 60, color: 'white' }} />
              </Avatar>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
       
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="All Documents" />
          <Tab label="My Documents" />
          <Tab label="Shared With Me" />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : filteredDocuments.length === 0 ? (
        <Paper 
          sx={{ 
            p: 5, 
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: 2
          }}
        >
          <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {currentTab === 0 
              ? "You don't have any documents yet." 
              : currentTab === 1 
                ? "You haven't created any documents yet."
                : "No documents have been shared with you."}
          </Typography>
          {currentTab !== 2 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Create Document
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredDocuments.map((document) => {
            const isOwner = document.owner === user?.id;
            const avatarColor = getRandomColor(document.title);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={document._id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    borderRadius: 2,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: avatarColor }}>
                        {getDocumentInitials(document.title)}
                      </Avatar>
                    }
                    action={
                      isOwner && (
                        <IconButton 
                          aria-label="delete" 
                          onClick={() => handleDeleteDocument(document._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                    title={document.title}
                    subheader={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(document.lastModified)}
                        </Typography>
                      </Box>
                    }
                  />
                  <Divider />
                  <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {isOwner ? (
                        <Chip
                          size="small"
                          icon={<PersonIcon fontSize="small" />}
                          label="Owner"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          size="small"
                          icon={<PeopleIcon fontSize="small" />}
                          label="Collaborator"
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                      {document.shareLink && (
                        <Chip
                          size="small"
                          icon={document.shareLink ? <PublicIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                          label={document.shareLink ? "Shared" : "Private"}
                          color={document.shareLink ? "success" : "default"}
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minHeight: '40px'
                      }}
                    >
                      {document.content.substring(0, 100) || 'No content yet'}
                      {document.content.length > 100 && '...'}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ justifyContent: 'space-between', p: 1.5 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/editor/${document._id}`)}
                      sx={{ borderRadius: 4 }}
                    >
                      Edit
                    </Button>
                    
                    <Tooltip title="Share document">
                      <IconButton 
                        color="primary"
                        onClick={() => handleOpenShareDialog(document._id)}
                        aria-label="share"
                      >
                        <ShareIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Document Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a title for your new document.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newDocument.title}
            onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
            error={!!error && !newDocument.title.trim()}
            helperText={!!error && !newDocument.title.trim() ? 'Title is required' : ''}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDocument} 
            color="primary" 
            variant="contained"
            disabled={!newDocument.title.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Document Dialog */}
      <Dialog 
        open={shareDialog.open} 
        onClose={() => setShareDialog({ open: false, documentId: null, documentTitle: '', email: '', shareLink: '', message: '', loading: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          Share "{shareDialog.documentTitle}"
        </DialogTitle>
        <DialogContent>
          {shareDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <DialogContentText sx={{ mb: 3 }}>
                Share this document with others by creating a share link or inviting them directly.
              </DialogContentText>

              <Typography variant="subtitle2" gutterBottom color="primary">
                Share Link
              </Typography>
              <Box sx={{ display: 'flex', mb: 3, mt: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={shareDialog.shareLink}
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mr: 1 }}
                />
                <Button 
                  variant="contained" 
                  color={linkCopied ? "success" : "primary"}
                  onClick={handleCopyShareLink}
                  startIcon={linkCopied ? <CheckIcon /> : <CopyIcon />}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {linkCopied ? 'Copied' : 'Copy'}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Chip label="OR" />
              </Divider>

              <Typography variant="subtitle2" gutterBottom color="primary">
                Invite by Email
              </Typography>
              <TextField
                fullWidth
                margin="dense"
                label="Email address"
                type="email"
                variant="outlined"
                value={shareDialog.email}
                onChange={(e) => setShareDialog({ ...shareDialog, email: e.target.value })}
                placeholder="colleague@example.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                margin="dense"
                label="Add a message (optional)"
                multiline
                rows={3}
                variant="outlined"
                value={shareDialog.message}
                onChange={(e) => setShareDialog({ ...shareDialog, message: e.target.value })}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setShareDialog({ open: false, documentId: null, documentTitle: '', email: '', shareLink: '', message: '', loading: false })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleShareDocument}
            color="primary"
            variant="contained"
            disabled={(!shareDialog.email && !shareDialog.shareLink) || shareDialog.loading}
            startIcon={shareDialog.loading ? <CircularProgress size={20} /> : <ShareIcon />}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Dashboard; 