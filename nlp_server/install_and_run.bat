@echo off
echo ===== Enhanced Theme Analysis Installation =====
echo This script will install the required dependencies and run the NLP server.
echo.

:: Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python not found. Please install Python 3.8 or higher.
    echo You can download it from https://www.python.org/downloads/
    pause
    exit /b
)

:: Run the custom installer script
echo Running the dependency installer...
python install.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Warning: Some errors occurred during installation.
    echo The system will still attempt to run with available components.
    echo Zero-shot classification may not be available.
    echo.
)

echo.
echo ===== Starting NLP Server =====
python app.py

pause 