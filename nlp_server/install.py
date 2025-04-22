import subprocess
import sys
import os
import platform

def install_requirements():
    print("Starting installation of NLP Server dependencies...")
    print("This may take a few minutes, especially when installing machine learning libraries.")
    
    # Core dependencies that are less likely to have issues
    core_dependencies = [
        "flask==2.0.1",
        "flask-cors==3.0.10",
        "nltk==3.6.2",
        "pronouncing==0.2.0",
        "requests==2.26.0"
    ]
    
    print("\nInstalling core dependencies...")
    for package in core_dependencies:
        try:
            print(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        except subprocess.CalledProcessError:
            print(f"Warning: Failed to install {package}. The application may not function correctly.")
    
    # Install NumPy with different approach based on OS
    print("\nInstalling NumPy...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "numpy==1.21.0"])
    except subprocess.CalledProcessError:
        print("Attempting to install NumPy with alternate version...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "numpy"])
        except subprocess.CalledProcessError:
            print("Warning: Failed to install NumPy. Some features may not work correctly.")
    
    # Install scikit-learn
    print("\nInstalling scikit-learn...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "scikit-learn==0.24.2"])
    except subprocess.CalledProcessError:
        print("Attempting to install scikit-learn with alternate version...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "scikit-learn"])
        except subprocess.CalledProcessError:
            print("Warning: Failed to install scikit-learn. The application will fall back to legacy methods.")
    
    # Install transformers
    print("\nInstalling transformers library...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "transformers==4.18.0"])
    except subprocess.CalledProcessError:
        print("Warning: Failed to install transformers. Zero-shot classification will not be available.")
    
    # Install PyTorch with different approach based on OS
    print("\nInstalling PyTorch...")
    try:
        if platform.system() == "Windows":
            subprocess.check_call([sys.executable, "-m", "pip", "install", "torch==1.11.0+cpu", "-f", "https://download.pytorch.org/whl/torch_stable.html"])
        else:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "torch==1.11.0"])
    except subprocess.CalledProcessError:
        print("Attempting to install PyTorch with alternate approach...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "torch"])
        except subprocess.CalledProcessError:
            print("Warning: Failed to install PyTorch. Zero-shot classification will not be available.")

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
    except ImportError:
        print("Warning: Failed to import NLTK. Please install NLTK manually and download required datasets.")

    print("\nInstallation completed with best-effort approach.")
    print("Some components may be missing if they failed to install.")
    print("The application will fall back to legacy methods when necessary.")

if __name__ == "__main__":
    install_requirements()
    print("\nSetup complete. Run 'python app.py' to start the NLP server.") 