@echo off
echo ========================================
echo Commit ו-Push ל-GitHub
echo ========================================
echo.

REM בדיקה אם יש Git repository
if not exist .git (
    echo [1/6] מאתחל Git repository...
    git init
    if %errorlevel% neq 0 (
        echo ❌ שגיאה: Git לא מותקן!
        pause
        exit /b 1
    )
) else (
    echo ✅ Git repository קיים
)
echo.

echo [2/6] מוסיף קבצים...
git add .
if %errorlevel% neq 0 (
    echo ❌ שגיאה בהוספת קבצים
    pause
    exit /b 1
)
echo ✅ קבצים נוספו
echo.

echo [3/6] יוצר commit...
git commit -m "Add USB support and GitHub Pages deployment"
if %errorlevel% neq 0 (
    echo ⚠️  אין שינויים חדשים או שגיאה ב-commit
)
echo.

echo [4/6] בודק remote...
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [5/6] מוסיף remote ל-GitHub...
    git remote add origin https://github.com/shaharprod/voice-remote.git
    if %errorlevel% neq 0 (
        echo ⚠️  Remote כבר קיים, מעדכן...
        git remote set-url origin https://github.com/shaharprod/voice-remote.git
    )
) else (
    echo ✅ Remote כבר מוגדר
)
echo.

echo [6/6] מעלה ל-GitHub (push)...
git branch -M main
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  אם יש שגיאה, ייתכן שצריך:
    echo 1. להתחבר ל-GitHub (username/password)
    echo 2. להשתמש ב-Personal Access Token במקום סיסמה
    echo 3. לבדוק שהריפוזיטורי קיים ב-GitHub
) else (
    echo.
    echo ========================================
    echo ✅ הושלם בהצלחה!
    echo ========================================
    echo.
    echo האפליקציה הועלתה ל:
    echo https://github.com/shaharprod/voice-remote
    echo.
    echo כעת אפשר להפעיל GitHub Pages:
    echo https://github.com/shaharprod/voice-remote/settings/pages
    echo.
)
echo.
pause

