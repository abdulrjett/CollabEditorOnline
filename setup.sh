#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up Collaborative Text Editor...${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "MongoDB is not installed. Please install MongoDB first."
    exit 1
fi

# Install server dependencies
echo -e "${GREEN}Installing server dependencies...${NC}"
cd server
npm install

# Install client dependencies
echo -e "\n${GREEN}Installing client dependencies...${NC}"
cd ../client
npm install

# Return to root directory
cd ..

# Create necessary directories if they don't exist
mkdir -p server/logs
mkdir -p client/build

echo -e "\n${GREEN}Setup completed successfully!${NC}"
echo -e "\n${BLUE}To start the application:${NC}"
echo "1. Start MongoDB service"
echo "2. In one terminal, run: cd server && npm run dev"
echo "3. In another terminal, run: cd client && npm start"
echo -e "\n${BLUE}The application will be available at:${NC}"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000" 