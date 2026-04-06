@echo off
setlocal

title NOMETA Local Host Launcher
cd /d "%~dp0"

echo =====================================================
echo   NOMETA - One Click Local Host
echo =====================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo Please install Node.js from: https://nodejs.org/
  echo Then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found.
  echo Please reinstall Node.js (npm comes with Node.js).
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/3] Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Dependencies already installed.
)

echo [2/3] Building production files from src to dist...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo [3/3] Starting local host from dist...
echo.
echo Server URL: http://localhost:4173
echo Press Ctrl+C to stop the server.
echo.
call npx --yes http-server dist -p 4173 -c-1 -o

endlocal
