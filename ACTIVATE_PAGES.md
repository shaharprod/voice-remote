# 🚀 הפעלת GitHub Pages

## שלב 1: העלה את הקבצים ל-GitHub

לחץ פעמיים על: **`commit-and-push.bat`** או **`upload-to-github.bat`**

או הרץ ידנית:
```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/shaharprod/voice-remote.git
git branch -M main
git push -u origin main
```

## שלב 2: הפעל GitHub Pages

### דרך 1: דרך Settings (המומלץ)

1. לך ל: https://github.com/shaharprod/voice-remote/settings/pages
2. תחת **"Source"** או **"Build and deployment"**:
   - בחר **Branch**
   - Branch: **main**
   - Folder: **/ (root)**
3. לחץ **Save**
4. חכה 1-2 דקות
5. האפליקציה תהיה זמינה ב: **https://shaharprod.github.io/voice-remote**

### דרך 2: דרך GitHub Actions (אוטומטי)

אם יצרת את קובץ `.github/workflows/deploy.yml`:
1. לך ל: https://github.com/shaharprod/voice-remote/settings/pages
2. תחת **"Source"** בחר: **GitHub Actions**
3. לחץ **Save**
4. כל push חדש יעלה אוטומטית

## שלב 3: בדיקה

לאחר הפעלה, בדוק:
- https://shaharprod.github.io/voice-remote
- אם יש שגיאה, בדוק ב-Settings > Pages את הסטטוס

## פתרון בעיות

**אם אין אפשרות לבחור branch:**
- ודא שהקבצים הועלו (יש commit ב-repository)
- רענן את הדף
- נסה דרך Actions במקום

**אם האתר לא עולה:**
- חכה 2-3 דקות
- בדוק את ה-logs ב-Settings > Pages
- ודא ש-index.html נמצא ב-root של ה-repository

## קישורים שימושיים

- Repository: https://github.com/shaharprod/voice-remote
- Settings: https://github.com/shaharprod/voice-remote/settings
- Pages: https://github.com/shaharprod/voice-remote/settings/pages
- האפליקציה: https://shaharprod.github.io/voice-remote

