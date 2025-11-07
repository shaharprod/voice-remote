@echo off
echo ========================================
echo העלאה ל-GitHub Repository
echo ========================================
echo.

echo [1/5] מאתחל Git repository...
git init
if %errorlevel% neq 0 (
    echo שגיאה: Git לא מותקן או לא נמצא ב-PATH
    pause
    exit /b 1
)

echo.
echo [2/5] מוסיף קבצים...
git add .

echo.
echo [3/5] יוצר commit...
git commit -m "Initial commit - Voice Remote App"

echo.
echo [4/5] מתחבר ל-GitHub repository...
git remote add origin https://github.com/shaharprod/voice-remote.git
if %errorlevel% neq 0 (
    echo הערה: Remote כבר קיים, מעדכן...
    git remote set-url origin https://github.com/shaharprod/voice-remote.git
)

echo.
echo [5/5] מעלה קבצים ל-GitHub...
git branch -M main
git push -u origin main

echo.
echo ========================================
echo הושלם! בדוק ב-GitHub:
echo https://github.com/shaharprod/voice-remote
echo ========================================
pause

