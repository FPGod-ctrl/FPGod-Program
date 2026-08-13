@echo off
REM ===================================================================
REM  STEP 1 of 2  -  Installs Node, Git, PostgreSQL and VS Code.
REM  Double-click this. It asks for admin rights itself.
REM
REM  A .bat wrapper exists because Windows blocks .ps1 files by default
REM  (execution policy is Restricted on a fresh PC) and files downloaded
REM  from Google Drive are additionally tagged as untrusted. This clears
REM  both, so there is nothing to configure first.
REM ===================================================================

setlocal
set "HERE=%~dp0"
if "%HERE:~-1%"=="\" set "HERE=%HERE:~0,-1%"

REM Caret line-continuation inside a parenthesised block is unreliable in cmd,
REM so every command below stays on one line.
net session >nul 2>&1
if not "%errorlevel%"=="0" goto :elevate
goto :isadmin

:elevate
echo Requesting administrator rights...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:isadmin

echo.
echo  FPGod migration - step 1 of 2
echo  Installing the development toolchain
echo  =====================================
echo.

if not exist "%HERE%\environment\reinstall-programs.ps1" (
    echo  ERROR: environment\reinstall-programs.ps1 is missing.
    echo  Make sure you copied the WHOLE folder down from Google Drive.
    echo.
    pause
    exit /b 1
)

REM Strip the "downloaded from the internet" tag Drive adds, or PowerShell
REM will refuse to run the scripts even with the policy bypassed.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%HERE%' -Recurse -File | Unblock-File -ErrorAction SilentlyContinue"

powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%\environment\reinstall-programs.ps1"

echo.
echo  ---------------------------------------------------------------
echo   Write down the PostgreSQL password you set - step 2 asks for it.
echo.
echo   Then close this window and run:  2-SETUP-EVERYTHING.bat
echo  ---------------------------------------------------------------
echo.
pause
