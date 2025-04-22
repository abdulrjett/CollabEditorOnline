@echo off
echo ===================================
echo Fixing NLP Server Dependencies
echo ===================================
echo.

echo Uninstalling problematic packages...
pip uninstall -y flask flask-cors werkzeug

echo.
echo Installing correct package versions...
pip install -r requirements.txt

echo.
echo Downloading required NLTK data...
python -c "import nltk; datasets=['wordnet', 'stopwords', 'punkt', 'averaged_perceptron_tagger', 'brown']; [nltk.download(d) for d in datasets]"

echo.
echo Dependencies fixed! You can now run the NLP server using install_and_run.bat
echo.
pause 