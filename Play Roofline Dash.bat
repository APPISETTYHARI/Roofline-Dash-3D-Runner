@echo off
setlocal
set PORT=8765
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:%PORT%/index.html' | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "Roofline Dash Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-game.ps1" -Port %PORT%
  timeout /t 2 /nobreak >nul
)
start "" "http://127.0.0.1:%PORT%/index.html"
endlocal
