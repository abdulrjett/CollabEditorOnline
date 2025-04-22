const express = require('express');
const router = express.Router();
const axios = require('axios');
const Document = require('../models/Document');
const Analysis = require('../models/Analysis');
const auth = require('../middleware/auth');

// Configuration for NLP server
const NLP_SERVER_URL = process.env.NLP_SERVER_URL || 'http://localhost:5001';

// Get latest analysis for a document
router.get('/document/:id', auth, async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check if document exists and user has access
    const document = await Document.findOne({
      _id: documentId,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or access denied' });
    }
    
    // Find the most recent analysis
    const analysis = await Analysis.findOne({ documentId })
      .sort({ analyzedAt: -1 })
      .limit(1);
    
    if (!analysis) {
      return res.status(404).json({ message: 'No analysis found for this document' });
    }
    
    // Format response
    const response = {
      documentId: analysis.documentId,
      themes: analysis.getThemesArray(),
      genres: analysis.getGenresArray(),
      keywords: analysis.keywords,
      analyzedAt: analysis.analyzedAt
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching document analysis:', error);
    res.status(500).json({ message: 'Error fetching document analysis' });
  }
});

// Get all analyses for a document
router.get('/document/:id/history', auth, async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check if document exists and user has access
    const document = await Document.findOne({
      _id: documentId,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or access denied' });
    }
    
    // Find all analyses for this document, sorted by date
    const analyses = await Analysis.find({ documentId })
      .sort({ analyzedAt: -1 });
    
    if (!analyses || analyses.length === 0) {
      return res.status(404).json({ message: 'No analyses found for this document' });
    }
    
    // Format response
    const response = analyses.map(analysis => ({
      documentId: analysis.documentId,
      themes: analysis.getThemesArray(),
      genres: analysis.getGenresArray(),
      keywords: analysis.keywords,
      analyzedAt: analysis.analyzedAt,
      id: analysis._id
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching document analysis history:', error);
    res.status(500).json({ message: 'Error fetching document analysis history' });
  }
});

// Create a new analysis for a document
router.post('/document/:id', auth, async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Check if document exists and user has access
    const document = await Document.findOne({
      _id: documentId,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or access denied' });
    }
    
    // Call NLP server to analyze the text
    const nlpResponse = await axios.post(`${NLP_SERVER_URL}/analyze_text`, {
      text: document.content
    });
    
    if (!nlpResponse.data) {
      return res.status(500).json({ message: 'Error analyzing document content' });
    }
    
    // Create new analysis document
    const analysis = new Analysis({
      documentId,
      analyzedBy: req.user._id,
      keywords: nlpResponse.data.keywords || []
    });
    
    // Convert themes and genres from object to Map
    const themes = nlpResponse.data.themes || {};
    Object.keys(themes).forEach(key => {
      analysis.themes.set(key, themes[key]);
    });
    
    const genres = nlpResponse.data.genres || {};
    Object.keys(genres).forEach(key => {
      analysis.genres.set(key, genres[key]);
    });
    
    await analysis.save();
    
    // Format response
    const response = {
      documentId: analysis.documentId,
      themes: analysis.getThemesArray(),
      genres: analysis.getGenresArray(),
      keywords: analysis.keywords,
      analyzedAt: analysis.analyzedAt,
      id: analysis._id
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating document analysis:', error);
    res.status(500).json({ message: 'Error creating document analysis' });
  }
});

module.exports = router; 