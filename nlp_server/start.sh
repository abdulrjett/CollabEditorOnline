#!/bin/bash

# Install dependencies if not already installed
pip install -r requirements.txt

# Download NLTK data if needed
python -c "import nltk; nltk.download('wordnet')"

# Start the Flask server
echo "Starting NLP server on port 5000..."
python app.py 