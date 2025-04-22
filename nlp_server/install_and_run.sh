#!/bin/bash

echo "======================================"
echo "Enhanced Theme Analysis Installation"
echo "======================================"
echo "This script will install the required dependencies and start the NLP server."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "Error: Python not found. Please install Python 3.8 or higher."
        echo "You can download it from https://www.python.org/downloads/"
        exit 1
    fi
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi

# Run the custom installer script
echo "Running the dependency installer..."
$PYTHON_CMD install.py

if [ $? -ne 0 ]; then
    echo
    echo "Warning: Some errors occurred during installation."
    echo "The system will still attempt to run with available components."
    echo "Zero-shot classification may not be available."
    echo
fi

echo
echo "======================================"
echo "Starting NLP Server"
echo "======================================"
echo "Access the API at http://localhost:5001"
echo "Press Ctrl+C to stop the server"
echo
$PYTHON_CMD app.py 