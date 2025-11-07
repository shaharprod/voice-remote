@echo off
echo ========================================
echo הפעלת שרת מקומי
echo ========================================
echo.

REM בדיקה אם Python מותקן
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python מותקן
    echo.
    echo 🚀 מפעיל שרת על פורט 8000...
    echo.
    echo האפליקציה תהיה זמינה ב:
    echo http://localhost:8000
    echo.
    echo לחץ Ctrl+C כדי לעצור את השרת
    echo.
    python -m http.server 8000
) else (
    echo ❌ Python לא מותקן
    echo.
    echo אפשרויות:
    echo 1. התקן Python מ: https://www.python.org/downloads/
    echo 2. או פתח את index.html ישירות בדפדפן
    echo 3. או השתמש ב-Node.js: npx http-server -p 8000
    echo.
    echo.
    echo פתיחת index.html בדפדפן...
    start index.html
    pause
)

