#!/bin/bash

echo "===== Enhanced Theme Analysis - Easy Install ====="
echo "This script will install the required dependencies and set up the NLP server."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "Error: Python not found. Please install Python 3.8 or higher."
        echo "You can download it from https://www.python.org/downloads/"
        read -p "Press Enter to exit..."
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
echo "===== Installation Complete ====="
echo
echo "To start the server:"
echo "   - Use install_and_run.sh to start the server immediately"
echo "   - Use 'python app.py' to start the server manually"
echo
echo "The server runs on http://localhost:5001"
echo

echo -n "Would you like to start the server now? (y/n): "
read choice

if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
    echo
    echo "===== Starting NLP Server ====="
    $PYTHON_CMD app.py
else
    echo
    echo "You can start the server later using install_and_run.sh"
    echo
fi

read -p "Press Enter to exit..." 