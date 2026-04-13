@echo off
echo ====================================
echo H. pylori Detection System
echo ====================================
echo.

echo Starting Cloudflare Tunnel for Frontend (port 5173)...
start "Cloudflare-Frontend" cmd /k "cloudflared.exe tunnel --url http://localhost:5173"

timeout /t 5 /nobreak >nul

echo Starting Cloudflare Tunnel for Backend (port 8000)...
start "Cloudflare-Backend" cmd /k "cloudflared.exe tunnel --url http://localhost:8000"

timeout /t 5 /nobreak >nul

echo Starting Backend...
start "Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ====================================
echo IMPORTANT: Check the Cloudflare windows for URLs!
echo ====================================
echo.
echo Once tunnels are running, you will see URLs like:
echo   https://xxxx.trycloudflare.com
echo.
echo Use the Frontend URL to access the app.
echo.
echo NOTE: Copy the Backend URL to frontend\.env if needed!
echo.
pause