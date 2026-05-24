@echo off
title VN-BECS-V2 One-Click Setup Utility
color 0b
echo =====================================================================
echo    VN-BECS-V2 Enterprise Blood Management - One-Click Setup Tool
echo =====================================================================
echo.

:: 1. Check Node.js installation
echo [STEP 1/4] Checking Node.js runtime environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is NOT installed on this computer!
    echo Please install Node.js (LTS Version 18, 20 or 22) first.
    echo Official Download Link: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [SUCCESS] Node.js version:
node -v
echo.

:: 2. Restore .env credentials configuration
echo [STEP 2/4] Verifying database credentials (.env file)...
if not exist .env (
    echo [WARNING] .env credentials file was not found!
    if exist .env.example (
        echo [INFO] Copying .env.example as .env template...
        copy .env.example .env >nul
        echo [SUCCESS] .env file successfully created from template!
        echo *****************************************************************
        echo IMPORTANT: Please open '.env' file in a text editor and paste
        echo your actual Supabase / Firebase API keys!
        echo *****************************************************************
    ) else (
        echo # VN-BECS Supabase & Firebase API Configuration > .env
        echo [SUCCESS] Created empty .env file.
    )
) else (
    echo [SUCCESS] .env credentials file detected.
)
echo.

:: 3. Automatically download and compile npm dependencies
echo [STEP 3/4] Installing node packages (npm install)...
echo This might take 1-2 minutes depending on your internet connection. Please wait...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install encountered an error!
    echo Please check your internet connection or NPM settings.
    echo.
    pause
    exit /b 1
)
echo [SUCCESS] All packages installed and compiled cleanly!
echo.

:: 4. Firebase Authentication Setup (Optional)
echo [STEP 4/4] Firebase deployment capability check...
echo Would you like to log in to Firebase to enable cloud deployment? (Y/N)
set /p opt="Enter choice: "
if /i "%opt%"=="Y" (
    echo.
    echo Opening browser for Google account Firebase authorization...
    call npx firebase login
) else (
    echo [INFO] Skipping Firebase login. (You can deploy later by running 'npx firebase login' manually.)
)
echo.

:: Start Development Server
echo =====================================================================
echo    VN-BECS V2 ONE-CLICK SETUP COMPLETE! Starting Local Server...
echo =====================================================================
echo.
echo Server is launching! Open http://localhost:54321 in your browser.
echo Press Ctrl + C in this window to stop the server at any time.
echo.
pause
call npm run dev
