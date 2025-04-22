@echo off
echo Starting the Collaborative Editor Application...

:: Start the Node.js server in a new window
echo Starting Node.js server on port 5000...
start "Node.js Server" cmd /k "cd server && npm run dev"

:: Start the NLP server in a new window
echo Starting NLP server on port 5001...
start "NLP Server" cmd /k "cd nlp_server && python app.py"

:: Start the React client in a new window
echo Starting React client on port 3000...
start "React Client" cmd /k "cd client && npm start"

echo.
echo All services are now running in separate windows:
echo - Node.js API: http://localhost:5000
echo - NLP Server: http://localhost:5001
echo - React Client: http://localhost:3000
echo.
echo Close each window individually to stop the services.
echo. 