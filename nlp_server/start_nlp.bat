@echo off
echo ======================================
echo Starting Enhanced Theme Analysis Server
echo ======================================
echo.
echo This service provides AI-powered theme analysis, genre detection, and keyword extraction
echo.

:: Check if python is installed
python --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Python is not installed or not in PATH.
  echo Please install Python 3.8+ from https://www.python.org/downloads/
  echo.
  pause
  exit /b 1
)

:: Run the installer script to ensure all dependencies are in place
echo Running dependency installer...
python install.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Warning: Some errors occurred during installation.
    echo The system will still attempt to run with available components.
    echo Zero-shot classification may not be available.
    echo.
)

:: Start the NLP server
echo.
echo ======================================
echo Starting NLP Server
echo ======================================
echo Access the API at http://localhost:5001
echo Press Ctrl+C to stop the server
echo.
python app.py

pause 