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
  echo Please reinstall Node.js ^(npm comes with Node.js^).
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/4] Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [1/4] Dependencies already installed.
)

echo [2/4] Clearing previous local host on port 4173...
powershell -NoProfile -Command ^
  "$localHosts = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*local-host-server.mjs*' }; " ^
  "if ($localHosts) { foreach ($proc in $localHosts) { Write-Output ('[INFO] Stopping old local host process PID ' + $proc.ProcessId + '...'); Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue } }"
powershell -NoProfile -Command ^
  "$pids = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; " ^
  "if ($pids) { foreach ($id in $pids) { Write-Output ('[INFO] Stopping previous process PID ' + $id + ' on port 4173...'); Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } } else { Write-Output '[INFO] No existing process found on port 4173.' }"

echo [3/4] Preparing build+watch pipeline...
echo [INFO] Initial build will run automatically.

echo [4/4] Starting live local host from dist (auto-built from src)...
echo [INFO] Preferred URL: http://localhost:4173 (auto fallback to next free port if needed)
echo.
echo Server URL will be printed by the host (^> [NOMETA] Local URL: ...^)
echo Press Ctrl+C to stop the server.
echo.
call npm run dev
if errorlevel 1 (
  echo.
  echo [ERROR] Local host failed to start.
  pause
  exit /b 1
)

endlocal
