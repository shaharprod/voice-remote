@echo off
chcp 65001 >nul
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
git commit -m "Fix IR indicators on GitHub Pages + NEON TV + cache-busting v2.5" --no-verify
if %errorlevel% neq 0 (
    echo ⚠️  אין שינויים חדשים או שגיאה ב-commit
    REM נמשיך גם אם אין שינויים
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

echo [5.5/6] מוריד שינויים מה-remote (pull)...
git pull origin main --no-rebase --no-edit
if %errorlevel% neq 0 (
    echo ⚠️  שגיאה ב-pull, מנסה rebase...
    git pull origin main --rebase --no-edit
    if %errorlevel% neq 0 (
        echo ⚠️  שגיאה גם ב-rebase, ממשיך עם push...
    )
)
echo.

echo [6/6] מעלה ל-GitHub (push)...
git branch -M main
git push -u origin main --force-with-lease
if %errorlevel% neq 0 (
    echo ⚠️  שגיאה ב-push עם force-with-lease, מנסה push רגיל...
    git push -u origin main
    if %errorlevel% neq 0 (
        echo.
        echo ⚠️  אם יש שגיאה, ייתכן שצריך:
        echo 1. להתחבר ל-GitHub (username/password)
        echo 2. להשתמש ב-Personal Access Token במקום סיסמה
        echo 3. לפתור קונפליקטים ידנית: git pull, ואז git push
        pause
        exit /b 1
    )
)

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
pause

