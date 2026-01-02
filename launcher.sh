#!/bin/bash

# Define constants
GREEN='\033[0;32m'
NC='\033[0m' # No Color
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}Starting Unified Launcher for LocalVocal Project Hub...${NC}"

# Navigate to project directory
cd "$PROJECT_DIR"

# Auto-update
echo -e "${GREEN}Checking for updates...${NC}"
git pull

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies."
        exit 1
    fi
else
    echo "Dependencies already installed."
fi

# Start the development server with Electron
echo -e "${GREEN}Launching Electron application...${NC}"
npm run electron:dev
