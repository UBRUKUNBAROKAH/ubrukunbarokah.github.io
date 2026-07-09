@echo off
cd /d "%~dp0"
git add .
git commit -m "update %date% %time%"
git push
echo.
echo ============ PUSH BERHASIL ============
pause
