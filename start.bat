@echo off
echo ====================================
echo H. pylori Detection System
echo ====================================
echo.

REM Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4" ^| findstr /v "127.0.0.1"') do set IP=%%a
set IP=%IP: =%

echo Detected IP: %IP%
echo.

REM Update backend .env
echo Updating backend configuration...
(
echo # Frontend URL for QR codes
echo FRONTEND_URL=http://%IP%:5173
echo.
echo # Firebase Configuration
echo FIREBASE_PROJECT_ID=
echo FIREBASE_PRIVATE_KEY_ID=
echo FIREBASE_PRIVATE_KEY=
echo FIREBASE_CLIENT_EMAIL=
echo FIREBASE_CLIENT_ID=
echo FIREBASE_STORAGE_BUCKET=
) > backend\.env

REM Update frontend .env
echo VITE_API_URL=http://%IP%:8000/api > frontend\.env

echo Starting Backend on port 8000...
start "Backend" cmd /k "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend on port 5173...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================
echo READY!
echo ====================================
echo Backend: http://%IP%:8000
echo Frontend: http://localhost:5173
echo From Mobile: http://%IP%:5173
echo.
echo Press any key to exit...
pause >nul