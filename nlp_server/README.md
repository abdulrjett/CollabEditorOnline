# Enhanced Theme Analysis with Zero-Shot Classification

This NLP server provides advanced text analysis capabilities including theme detection, genre classification, and keyword extraction using state-of-the-art AI models.

## Features

- **AI-Powered Theme Analysis**: Uses Hugging Face's zero-shot classification model to accurately identify themes in text
- **Genre Classification**: Identifies document genres with high accuracy using AI models and structural analysis
- **Keyword Extraction**: Extracts important keywords and phrases from text
- **Fallback Mechanisms**: Has robust fallback to traditional NLP methods if AI models are unavailable
- **Word Tools**: Provides rhyming words, synonyms, and definitions

## Installation Options

### Option 1: Easy Installation (Recommended for Windows)
Use the included installation script that handles dependencies in a more error-tolerant way:

```bash
# On Windows
install_and_run.bat

# On macOS/Linux
python install.py
python app.py
```

### Option 2: Manual Installation 
If you prefer manual installation or need more control:

1. Install Python 3.8 or higher
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

3. Download the required NLTK data:
```bash
python -c "import nltk; nltk.download('wordnet'); nltk.download('stopwords'); nltk.download('punkt'); nltk.download('averaged_perceptron_tagger'); nltk.download('brown')"
```

## Usage

1. Start the server:

```bash
python app.py
```

2. The server will run on port 5001 (configurable via the PORT environment variable)
3. Access the API at `http://localhost:5001`

## API Endpoints

### Theme Analysis

```
POST /analyze_text
```

Request body:
```json
{
  "text": "Your text to analyze goes here..."
}
```

Response:
```json
{
  "themes": {
    "Love": 30,
    "Science": 25,
    "Technology": 20,
    "...": "..."
  },
  "genres": {
    "Essay": 60,
    "Technical": 25,
    "...": "..."
  },
  "keywords": ["keyword1", "keyword2", "..."]
}
```

### Other Endpoints

- `GET /get_rhymes?word=example` - Get rhyming words for a given word
- `GET /get_definition?word=example` - Get definition of a word
- `GET /health` - Check if the server is running

## How it Works

The theme analysis system uses Facebook's BART large model (facebook/bart-large-mnli) for zero-shot classification. This allows the system to identify themes without being explicitly trained on theme data.

For genre classification, the system combines AI classification with structural analysis of text features like line length, paragraph structure, dialogue ratio, etc.

If the AI model isn't available, the system falls back to traditional NLP techniques using keyword matching, TF-IDF, and WordNet-based semantic similarity.

## Performance Considerations

- The first request may be slow as the AI model needs to be loaded into memory
- Processing very long texts will take more time as they need to be chunked
- Recommended to run on a system with at least 4GB of RAM due to model size

## Troubleshooting

### Installation Issues
If you encounter errors during installation:

1. Try using the `install.py` script which handles dependency issues more gracefully
2. For Windows users, ensure you have Microsoft Visual C++ 14.0 or newer installed
3. If scikit-learn fails to install, the system will still work but will use legacy methods

### Runtime Issues

If you encounter the error "Zero-shot classifier not available", it means the system couldn't load the Hugging Face model. This could be due to:

1. Insufficient memory
2. No internet connection when first loading the model
3. Issues with PyTorch installation

In these cases, the system will automatically fall back to traditional NLP methods. 
