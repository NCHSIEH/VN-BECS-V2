#!/bin/bash

# VN-BECS-V2 One-Click Setup Utility for macOS / Linux
echo "====================================================================="
echo "   VN-BECS-V2 Enterprise Blood Management - One-Click Setup Tool"
echo "====================================================================="
echo ""

# 1. Check Node.js installation
echo "[STEP 1/4] Checking Node.js runtime environment..."
if ! command -v node &> /dev/null; then
    echo ""
    echo "[ERROR] Node.js is NOT installed on this computer!"
    echo "Please install Node.js (LTS Version 18, 20 or 22) first."
    echo "Official Download Link: https://nodejs.org/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi
echo "[SUCCESS] Node.js version: $(node -v)"
echo ""

# 2. Restore .env credentials configuration
echo "[STEP 2/4] Verifying database credentials (.env file)..."
if [ ! -f .env ]; then
    echo "[WARNING] .env credentials file was not found!"
    if [ -f .env.example ]; then
        echo "[INFO] Copying .env.example as .env template..."
        cp .env.example .env
        echo "[SUCCESS] .env file successfully created from template!"
        echo "*****************************************************************"
        echo "IMPORTANT: Please open '.env' file in a text editor and paste"
        echo "your actual Supabase / Firebase API keys!"
        echo "*****************************************************************"
    else
        echo "# VN-BECS Supabase & Firebase API Configuration" > .env
        echo "[SUCCESS] Created empty .env file."
    fi
else
    echo "[SUCCESS] .env credentials file detected."
fi
echo ""

# 3. Automatically download and compile npm dependencies
echo "[STEP 3/4] Installing node packages (npm install)..."
echo "This might take 1-2 minutes depending on your internet connection. Please wait..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] npm install encountered an error!"
    echo "Please check your internet connection or NPM settings."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi
echo "[SUCCESS] All packages installed and compiled cleanly!"
echo ""

# 4. Firebase Authentication Setup (Optional)
echo "[STEP 4/4] Firebase deployment capability check..."
read -p "Would you like to log in to Firebase to enable cloud deployment? (Y/N): " opt
if [[ "$opt" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Opening browser for Google account Firebase authorization..."
    npx firebase login
else
    echo "[INFO] Skipping Firebase login. (You can deploy later by running 'npx firebase login' manually.)"
fi
echo ""

# Start Development Server
echo "====================================================================="
echo "   VN-BECS V2 ONE-CLICK SETUP COMPLETE! Starting Local Server..."
echo "====================================================================="
echo ""
echo "Server is launching! Open http://localhost:54321 in your browser."
echo "Press Ctrl + C in this window to stop the server at any time."
echo ""
read -p "Press Enter to continue starting server..."
npm run dev
