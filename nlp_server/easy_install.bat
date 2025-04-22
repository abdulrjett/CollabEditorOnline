@echo off
echo ===== Enhanced Theme Analysis - Easy Install =====
echo This script will install the required dependencies and set up the NLP server.
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
echo ===== Installation Complete =====
echo.
echo To start the server:
echo    - Use install_and_run.bat to start the server immediately
echo    - Use start_nlp.bat to start the server later
echo.
echo The server runs on http://localhost:5001
echo.

echo Would you like to start the server now? (Y/N)
set /p choice="Enter your choice: "

if /i "%choice%"=="Y" (
    echo.
    echo ===== Starting NLP Server =====
    python app.py
) else (
    echo.
    echo You can start the server later using install_and_run.bat
)

pause 