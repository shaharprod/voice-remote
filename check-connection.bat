@echo off
echo ========================================
echo בדיקת חיבוריות ל-GitHub
echo ========================================
echo.

echo [1/4] בודק אם Git מותקן...
git --version
if %errorlevel% neq 0 (
    echo ❌ Git לא מותקן!
    echo אנא התקן Git מ: https://git-scm.com/
    pause
    exit /b 1
) else (
    echo ✅ Git מותקן
)
echo.

echo [2/4] בודק אם יש Git repository...
if exist .git (
    echo ✅ Git repository קיים
    git status
) else (
    echo ⚠️  אין Git repository - צריך להריץ: git init
)
echo.

echo [3/4] בודק חיבור ל-GitHub remote...
git remote -v
if %errorlevel% neq 0 (
    echo ⚠️  אין remote מוגדר
) else (
    echo ✅ Remote מוגדר
)
echo.

echo [4/4] בודק חיבור ל-GitHub...
ping -n 1 github.com >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ חיבור לאינטרנט תקין
) else (
    echo ❌ אין חיבור לאינטרנט
)
echo.

echo ========================================
echo סיכום:
echo ========================================
echo.
if exist .git (
    echo ✅ Git repository: קיים
) else (
    echo ❌ Git repository: לא קיים - הרץ: git init
)
echo.
git remote get-url origin 2>nul
if %errorlevel% equ 0 (
    echo ✅ Remote: מוגדר
) else (
    echo ❌ Remote: לא מוגדר - הרץ: git remote add origin https://github.com/shaharprod/voice-remote.git
)
echo.
echo ========================================
pause

