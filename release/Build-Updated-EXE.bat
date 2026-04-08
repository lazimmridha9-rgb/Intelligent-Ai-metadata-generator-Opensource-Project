@echo off
setlocal
title NoMeta - Build Updated EXE

REM This script lives in /release and builds from a clean sibling workspace.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "BUILD_ROOT=%PROJECT_ROOT%-build"

echo.
echo ===============================================
echo   NoMeta Metadata Generator - EXE Build Tool
echo ===============================================
echo.
echo Project Root: "%PROJECT_ROOT%"
echo Build Root  : "%BUILD_ROOT%"
echo.

if not exist "%PROJECT_ROOT%\package.json" (
  echo [ERROR] package.json not found in project root.
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  echo.
  pause
  exit /b 1
)

echo [STEP 1/4] Syncing source to clean build workspace...
if not exist "%BUILD_ROOT%" mkdir "%BUILD_ROOT%"
robocopy "%PROJECT_ROOT%" "%BUILD_ROOT%" /MIR /XD node_modules .git dist release >nul
set "ROBO_EXIT=%ERRORLEVEL%"
if %ROBO_EXIT% GEQ 8 goto :build_failed

echo [STEP 2/4] Installing dependencies in build workspace...
pushd "%BUILD_ROOT%" >nul
call npm install
if errorlevel 1 goto :build_failed

echo [STEP 3/4] Building updated Windows installer...
call npm run dist:win
if errorlevel 1 goto :build_failed

echo [STEP 4/4] Copying build output to project release folder...
if not exist "%PROJECT_ROOT%\release" mkdir "%PROJECT_ROOT%\release"
robocopy "%BUILD_ROOT%\release" "%PROJECT_ROOT%\release" /E >nul
set "ROBO_EXIT=%ERRORLEVEL%"
if %ROBO_EXIT% GEQ 8 goto :build_failed

set "LATEST_SETUP="
for %%F in ("%PROJECT_ROOT%\release\*Setup *.exe") do set "LATEST_SETUP=%%~fF"

echo.
echo Build completed successfully.
if defined LATEST_SETUP (
  echo Installer:
  echo "%LATEST_SETUP%"
) else (
  echo Installer created in:
  echo "%PROJECT_ROOT%\release\"
)
echo.
popd >nul
pause
exit /b 0

:build_failed
echo.
echo [ERROR] Build failed. Check the log above.
echo.
popd >nul 2>nul
pause
exit /b 1
