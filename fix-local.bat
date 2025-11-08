@echo off
chcp 65001 >nul
echo ========================================
echo תיקון בעיות הפעלה לוקאלית
echo ========================================
echo.

REM מעבר לתיקיית הפרויקט
cd /d "%~dp0"
echo 📁 תיקייה: %CD%
echo.

REM בדיקה אם index.html קיים
if not exist "index.html" (
    echo ❌ שגיאה: לא נמצא index.html
    echo ודא שאתה בתיקייה הנכונה
    pause
    exit /b 1
)
echo ✅ נמצא index.html
echo.

REM בדיקת Python
echo בדיקת Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python --version
    echo ✅ Python מותקן
) else (
    echo ❌ Python לא מותקן
)
echo.

REM בדיקת Node.js
echo בדיקת Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    node --version
    echo ✅ Node.js מותקן
) else (
    echo ❌ Node.js לא מותקן
)
echo.

REM בדיקת פורט 8000
echo בדיקת פורט 8000...
netstat -an | findstr ":8000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  פורט 8000 תפוס
    echo.
    echo אפשרויות:
    echo 1. עצור את השרת הקודם (Ctrl+C בחלון השרת)
    echo 2. או השתמש בפורט אחר (8080)
) else (
    echo ✅ פורט 8000 פנוי
)
echo.

REM בדיקת קבצים נדרשים
echo בדיקת קבצים נדרשים...
if exist "app.js" (
    echo ✅ app.js
) else (
    echo ❌ app.js חסר
)

if exist "styles.css" (
    echo ✅ styles.css
) else (
    echo ❌ styles.css חסר
)

if exist "index.html" (
    echo ✅ index.html
) else (
    echo ❌ index.html חסר
)
echo.

echo ========================================
echo פתרונות:
echo ========================================
echo.
echo 1. אם Python/Node.js לא מותקנים:
echo    - התקן Python: https://www.python.org/downloads/
echo    - התקן Node.js: https://nodejs.org/
echo.
echo 2. אם הפורט תפוס:
echo    - עצור את השרת הקודם
echo    - או השתמש בפורט אחר
echo.
echo 3. להפעלה:
echo    - הרץ: start-server.bat
echo    - או: start-local.bat
echo.
echo 4. אם עדיין לא עובד:
echo    - פתח את index.html ישירות: open-directly.bat
echo    - או פתח ידנית: start index.html
echo.
pause

