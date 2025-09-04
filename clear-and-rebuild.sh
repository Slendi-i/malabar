#!/bin/bash

echo "Clearing Next.js cache and rebuilding..."

echo "Step 1: Stopping servers..."
pkill -f "next" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

echo "Step 2: Removing .next folder..."
rm -rf .next

echo "Step 3: Removing out folder..."
rm -rf out

echo "Step 4: Clearing npm cache..."
npm cache clean --force

echo "Step 5: Reinstalling dependencies..."
npm install

echo "Step 6: Building project..."
npm run build

echo "Step 7: Starting development server..."
npm run dev

echo "Done! Check if the webpack error is fixed."
