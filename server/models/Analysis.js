const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  themes: {
    type: Map,
    of: Number,
    default: {}
  },
  genres: {
    type: Map,
    of: Number,
    default: {}
  },
  keywords: {
    type: [String],
    default: []
  },
  analyzedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  analyzedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index on documentId and analyzedAt
analysisSchema.index({ documentId: 1, analyzedAt: -1 });

// Method to get themes as array of objects
analysisSchema.methods.getThemesArray = function() {
  const themesArray = [];
  this.themes.forEach((value, key) => {
    themesArray.push({ name: key, score: value });
  });
  return themesArray.sort((a, b) => b.score - a.score);
};

// Method to get genres as array of objects
analysisSchema.methods.getGenresArray = function() {
  const genresArray = [];
  this.genres.forEach((value, key) => {
    genresArray.push({ name: key, score: value });
  });
  return genresArray.sort((a, b) => b.score - a.score);
};

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis; 