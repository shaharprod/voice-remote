@echo off
echo ========================================
echo תיקון Push - Pull ואז Push
echo ========================================
echo.

echo [1/3] מוריד שינויים מה-remote...
git pull origin main --no-edit
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  יש קונפליקטים, מנסה rebase...
    git pull origin main --rebase
    if %errorlevel% neq 0 (
        echo.
        echo ❌ יש קונפליקטים שצריך לפתור ידנית
        echo הרץ: git pull origin main
        pause
        exit /b 1
    )
)
echo ✅ Pull הושלם
echo.

echo [2/3] בודק סטטוס...
git status
echo.

echo [3/3] מעלה ל-GitHub...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo ❌ שגיאה ב-push
    echo נסה: git push -u origin main --force
    echo (זהיר: force push מחליף את ה-remote!)
) else (
    echo.
    echo ========================================
    echo ✅ הושלם בהצלחה!
    echo ========================================
    echo.
    echo האפליקציה הועלתה ל:
    echo https://github.com/shaharprod/voice-remote
    echo.
)
echo.
pause

