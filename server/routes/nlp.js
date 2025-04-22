const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

// Define the Flask NLP server URL
const NLP_SERVER_URL = process.env.NLP_SERVER_URL || 'http://localhost:5001';

// Helper function to check if NLP server is available
const isNLPServerAvailable = async () => {
  try {
    await axios.get(`${NLP_SERVER_URL}/health`, { timeout: 1000 });
    return true;
  } catch (error) {
    console.error('NLP server health check failed:', error.message);
    return false;
  }
};

// Fallback functions for when NLP server is not available
const getFallbackRhymes = (word) => {
  // Simple fallback response when NLP server is down
  console.log(`Using fallback rhymes for word: ${word}`);
  return {
    word,
    rhymes: [],
    synonyms: [],
    fallback: true
  };
};

/**
 * @route   GET /api/nlp/rhymes
 * @desc    Get rhyming words and synonyms for a given word
 * @access  Private
 */
router.get('/rhymes', auth, async (req, res) => {
  try {
    const word = req.query.word;
    
    if (!word) {
      return res.status(400).json({ 
        success: false, 
        message: 'Word parameter is required' 
      });
    }

    // Check if NLP server is available
    const nlpAvailable = await isNLPServerAvailable();
    
    if (!nlpAvailable) {
      // Return fallback data if NLP server is not available
      return res.json({
        success: true,
        data: getFallbackRhymes(word),
        message: 'NLP server is currently unavailable. Using fallback response.'
      });
    }

    // Call the Python Flask API with timeout
    try {
      const response = await axios.get(`${NLP_SERVER_URL}/get_rhymes`, {
        params: { word },
        timeout: 3000 // 3 second timeout
      });

      return res.json({
        success: true,
        data: response.data
      });
    } catch (apiError) {
      console.error('Error calling NLP API:', apiError.message);
      
      // Return fallback if API call fails
      return res.json({
        success: true,
        data: getFallbackRhymes(word),
        message: 'NLP service temporarily unavailable. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error getting rhymes:', error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Server error when retrieving suggestions'
    });
  }
});

/**
 * @route   GET /api/nlp/health
 * @desc    Check if NLP service is running
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const isAvailable = await isNLPServerAvailable();
    
    return res.json({
      success: true,
      status: isAvailable ? 'healthy' : 'unavailable',
      serviceUrl: NLP_SERVER_URL
    });
  } catch (error) {
    console.error('NLP service health check failed:', error.message);
    return res.status(200).json({
      success: true,
      status: 'unavailable',
      message: 'NLP service unavailable'
    });
  }
});

module.exports = router; 