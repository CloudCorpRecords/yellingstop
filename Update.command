#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "----------------------------------------"
echo "  Updating LocalVocal Project Hub..."
echo "----------------------------------------"

echo "1. Checking for git updates..."
git pull

echo "2. Installing dependencies..."
npm install

echo "----------------------------------------"
echo "  Update Complete!"
echo "----------------------------------------"
echo "You can close this window now."
read -p "Press any key to exit..."
