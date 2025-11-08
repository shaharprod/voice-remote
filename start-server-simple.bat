@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo מפעיל שרת מקומי...
echo.
python -m http.server 8000 2>nul
if errorlevel 1 (
    echo מנסה פורט 8080...
    python -m http.server 8080
)
pause

