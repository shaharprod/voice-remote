@echo off
chcp 65001 >nul
echo ========================================
echo הפעלת שרת מקומי
echo ========================================
echo.

REM מעבר לתיקיית הפרויקט
cd /d "%~dp0"
if not exist "index.html" (
    echo ❌ שגיאה: לא נמצא index.html בתיקייה הנוכחית
    echo התיקייה הנוכחית: %CD%
    pause
    exit /b 1
)

echo 📁 תיקייה: %CD%
echo.

REM בדיקה אם Python מותקן
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python מותקן
    python --version
    echo.
    echo 🚀 מפעיל שרת על פורט 8000...
    echo.
    echo האפליקציה תהיה זמינה ב:
    echo http://localhost:8000
    echo http://127.0.0.1:8000
    echo.
    echo לחץ Ctrl+C כדי לעצור את השרת
    echo.
    python -m http.server 8000
    if %errorlevel% neq 0 (
        echo.
        echo ❌ שגיאה בהפעלת השרת
        echo ייתכן שהפורט 8000 תפוס
        echo.
        echo מנסה פורט אחר...
        python -m http.server 8080
    )
) else (
    echo ❌ Python לא מותקן
    echo.
    echo בדיקת Node.js...
    node --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Node.js מותקן
        node --version
        echo.
        echo 🚀 מפעיל שרת על פורט 8000...
        echo.
        echo האפליקציה תהיה זמינה ב:
        echo http://localhost:8000
        echo http://127.0.0.1:8000
        echo.
        echo לחץ Ctrl+C כדי לעצור את השרת
        echo.
        npx --yes http-server -p 8000 -o
        if %errorlevel% neq 0 (
            echo.
            echo ❌ שגיאה בהפעלת השרת
            echo ייתכן שהפורט 8000 תפוס
            echo.
            echo מנסה פורט אחר...
            npx --yes http-server -p 8080 -o
        )
    ) else (
        echo ❌ גם Node.js לא מותקן
        echo.
        echo אפשרויות:
        echo 1. התקן Python מ: https://www.python.org/downloads/
        echo 2. התקן Node.js מ: https://nodejs.org/
        echo 3. או פתח את index.html ישירות בדפדפן
        echo.
        echo פתיחת index.html בדפדפן...
        start index.html
        pause
    )
)

