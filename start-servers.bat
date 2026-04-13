@echo off
echo ====================================
echo H. pylori Detection System
echo ====================================
echo.
echo IMPORTANT: Keep these windows open!
echo.

echo Starting Frontend on port 5173...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 /nobreak >nul

echo Starting Backend on port 8000...
start "Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --host 0.0.0.0 --port 8000"

echo.
echo ====================================
echo DONE! Now:
echo 1. Go to http://localhost:5173 on your computer
echo 2. To access from mobile, run:
echo    cloudflared.exe tunnel --url http://localhost:5173
echo.
echo Copy that cloudflare URL to your mobile browser
echo ====================================
echo.
pause