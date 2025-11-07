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
    cd /d "%~dp0"
    python -m http.server 8000
    pause
    exit
)

REM בדיקה אם Node.js מותקן
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js מותקן
    echo.
    echo 🚀 מפעיל שרת על פורט 8000...
    echo.
    echo האפליקציה תהיה זמינה ב:
    echo http://localhost:8000
    echo.
    echo לחץ Ctrl+C כדי לעצור את השרת
    echo.
    cd /d "%~dp0"
    npx --yes http-server -p 8000 -o
    pause
    exit
)

REM אם אין Python או Node.js, פתח ישירות
echo ⚠️  Python ו-Node.js לא מותקנים
echo.
echo פתיחת index.html ישירות בדפדפן...
echo.
echo הערה: חלק מהתכונות דורשות שרת מקומי
echo.
cd /d "%~dp0"
start index.html
pause

