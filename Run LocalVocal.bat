@echo off
title LocalVocal
color 0B

cd /d "%~dp0"

echo Starting LocalVocal...
echo.

REM Check if built app exists
if exist "release\win-unpacked\LocalVocal.exe" (
    start "" "release\win-unpacked\LocalVocal.exe"
) else (
    echo No built app found. Running in dev mode...
    call npm run electron:dev
)
