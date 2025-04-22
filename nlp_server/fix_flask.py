#!/usr/bin/env python
import subprocess
import sys
import os

print("========================================")
print("Fixing Flask and Werkzeug Compatibility")
print("========================================")
print()

# Uninstall problematic packages
print("Uninstalling problematic packages...")
subprocess.call([sys.executable, "-m", "pip", "uninstall", "-y", "flask", "flask-cors", "werkzeug"])

# Install correct versions
print("\nInstalling correct package versions...")
subprocess.call([sys.executable, "-m", "pip", "install", "werkzeug==2.0.2", "flask==2.0.1", "flask-cors==3.0.10", "nltk==3.6.5", "pronouncing==0.2.0"])

# Download NLTK data
print("\nDownloading NLTK data...")
try:
    import nltk
    for dataset in ['wordnet', 'stopwords', 'punkt', 'averaged_perceptron_tagger', 'brown']:
        try:
            print(f"Downloading NLTK dataset: {dataset}")
            nltk.download(dataset, quiet=True)
        except Exception as e:
            print(f"Warning: Failed to download NLTK dataset {dataset}: {str(e)}")
    print("NLTK data downloaded successfully")
except Exception as e:
    print(f"Error downloading NLTK data: {e}")
    print("You may need to manually download the NLTK data. Please run:")
    print(f"{sys.executable} -m nltk.downloader wordnet stopwords punkt averaged_perceptron_tagger brown")

print("\nDependencies fixed! You can now run the NLP server with:")
print("python app.py")
print("\nPress Enter to exit...")
input() 