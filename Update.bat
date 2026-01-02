@echo off
title LocalVocal Updater
color 0A

echo ====================================
echo    LocalVocal Update Script
echo ====================================
echo.

cd /d "%~dp0"

echo [1/3] Pulling latest changes...
git pull
if errorlevel 1 (
    echo ERROR: Git pull failed
    pause
    exit /b 1
)

echo.
echo [2/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [3/3] Building application...
call npm run dist:win
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ====================================
echo    Update Complete!
echo ====================================
echo.
echo The new installer is in: release\
echo.
pause
