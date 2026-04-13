@echo off
echo Starting tunnel and saving URL...
cloudflared.exe tunnel --url http://localhost:5173 --metrics 0.0.0.0:9090 2>&1 | findstr /C:"https://" /C:"trycloudflare" > url.txt
type url.txt