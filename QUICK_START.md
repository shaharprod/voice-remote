# 🚀 הוראות מהירות - העלאה ל-GitHub

## שלב 1: פתח PowerShell בתיקיית הפרויקט

```powershell
cd "C:\Users\User\Downloads\voice remote"
```

## שלב 2: אתחל Git

```powershell
git init
```

## שלב 3: הוסף קבצים

```powershell
git add .
```

## שלב 4: צור Commit

```powershell
git commit -m "Initial commit - Voice Remote App"
```

## שלב 5: צור Repository ב-GitHub

1. לך ל: https://github.com/new
2. הזן שם ל-repository (למשל: `voice-remote`)
3. **אל תסמן** "Initialize with README"
4. לחץ "Create repository"

## שלב 6: התחבר ל-GitHub

החלף `YOUR_USERNAME` ו-`YOUR_REPO_NAME`:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## ✅ סיימת!

האפליקציה תהיה זמינה ב:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

## הפעלת GitHub Pages

1. Settings > Pages
2. Source: Deploy from a branch
3. Branch: `main`, Folder: `/ (root)`
4. Save

