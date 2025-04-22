#!/bin/bash

echo "Starting the Collaborative Editor Application..."

# Start the Node.js server in the background
echo "Starting Node.js server on port 5000..."
cd server
npm run dev &
NODE_SERVER_PID=$!
cd ..

# Start the NLP server in the background
echo "Starting NLP server on port 5001..."
cd nlp_server
python app.py &
NLP_SERVER_PID=$!
cd ..

# Start the React client
echo "Starting React client on port 3000..."
cd client
npm start &
CLIENT_PID=$!
cd ..

echo "All services are now running:"
echo "- Node.js API: http://localhost:5000"
echo "- NLP Server: http://localhost:5001"
echo "- React Client: http://localhost:3000"
echo ""
echo "Press Ctrl+C to shut down all services"

# Handle shutdown
function cleanup {
  echo "Shutting down all services..."
  kill $NODE_SERVER_PID
  kill $NLP_SERVER_PID
  kill $CLIENT_PID
  echo "All services have been stopped."
  exit 0
}

trap cleanup SIGINT

# Keep the script running
while true; do
  sleep 1
done 