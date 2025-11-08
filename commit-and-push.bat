@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo Commit and Push to GitHub
echo ========================================
echo.

REM Check if Git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH!
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo [OK] Git is installed

REM Check if Git repository exists
if not exist .git (
    echo [1/6] Initializing Git repository...
    git init
    if %errorlevel% neq 0 (
        echo ERROR: Cannot initialize Git repository!
        pause
        exit /b 1
    )
    echo [OK] Git repository created
) else (
    echo [OK] Git repository exists
)
echo.

echo [2/6] Adding files...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo [OK] Files added

REM Check if there are changes
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo [INFO] No new changes to commit
) else (
    echo [OK] New changes to commit
)
echo.

echo [3/6] Creating commit...
git commit -m "Add multiple NEON TV models (7 total) + Electra/Tadiran AC + cache-busting v2.10" --no-verify
if %errorlevel% neq 0 (
    echo [WARNING] No new changes or commit error
    REM Continue even if no changes
)
echo.

echo [4/6] Checking remote...
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [5/6] Adding remote to GitHub...
    git remote add origin https://github.com/shaharprod/voice-remote.git
    if %errorlevel% neq 0 (
        echo [WARNING] Remote already exists, updating...
        git remote set-url origin https://github.com/shaharprod/voice-remote.git
    )
) else (
    echo [OK] Remote already configured
)
echo.

echo [5.5/6] Pulling changes from remote...
git pull origin main --no-rebase --no-edit 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Pull error, trying rebase...
    git pull origin main --rebase --no-edit 2>nul
    if %errorlevel% neq 0 (
        echo [WARNING] Rebase also failed, continuing with push...
        echo [INFO] This is normal if this is the first push
    ) else (
        echo [OK] Pull succeeded (rebase)
    )
) else (
    echo [OK] Pull succeeded
)
echo.

echo [6/6] Pushing to GitHub...
git branch -M main
git push -u origin main --force-with-lease
if %errorlevel% neq 0 (
    echo [WARNING] Push with force-with-lease failed, trying regular push...
    git push -u origin main
    if %errorlevel% neq 0 (
        echo.
        echo [WARNING] If there is an error, you may need to:
        echo 1. Login to GitHub (username/password)
        echo 2. Use Personal Access Token instead of password
        echo 3. Resolve conflicts manually: git pull, then git push
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo [SUCCESS] Completed successfully!
echo ========================================
echo.
echo Application uploaded to:
echo https://github.com/shaharprod/voice-remote
echo.
echo You can now activate GitHub Pages:
echo https://github.com/shaharprod/voice-remote/settings/pages
echo.
pause

