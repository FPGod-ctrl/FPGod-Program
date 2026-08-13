@echo off
REM ===================================================================
REM  STEP 2 of 2  -  Restores the app, database, documents, VS Code.
REM  Double-click this after step 1. Do NOT run as administrator -
REM  it installs into your own user profile.
REM ===================================================================

setlocal
set "HERE=%~dp0"
if "%HERE:~-1%"=="\" set "HERE=%HERE:~0,-1%"

echo.
echo  FPGod migration - step 2 of 2
echo  Restoring the application and your data
echo  =======================================
echo.
echo  This will:
echo    - put the code in C:\FPGod-Program
echo    - restore the database (250 client accounts)
echo    - restore uploaded documents and settings
echo    - reinstall your VS Code extensions
echo    - install dependencies and build the app
echo.
echo  Takes 10-15 minutes. You will be asked for the PostgreSQL
echo  password you set in step 1.
echo.
pause

if not exist "%HERE%\setup-new-pc.ps1" (
    echo.
    echo  ERROR: setup-new-pc.ps1 is missing.
    echo  Make sure you copied the WHOLE folder down from Google Drive.
    echo.
    pause
    exit /b 1
)

REM One line each - caret continuation is unreliable in cmd.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%HERE%' -Recurse -File | Unblock-File -ErrorAction SilentlyContinue"

powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%\setup-new-pc.ps1" -BundlePath "%HERE%"

echo.
pause
