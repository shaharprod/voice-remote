# 📤 הוראות העלאה ל-GitHub

## Repository שלך:
**https://github.com/shaharprod/voice-remote**

## אפשרות 1: הרץ את הסקריפט האוטומטי

פשוט לחץ פעמיים על:
**`upload-to-github.bat`**

## אפשרות 2: הרץ ידנית ב-PowerShell

פתח PowerShell בתיקיית הפרויקט והרץ:

```powershell
# 1. אתחול Git
git init

# 2. הוספת קבצים
git add .

# 3. יצירת commit
git commit -m "Initial commit - Voice Remote App"

# 4. התחברות ל-GitHub
git remote add origin https://github.com/shaharprod/voice-remote.git

# 5. העלאה
git branch -M main
git push -u origin main
```

## אם יש שגיאה "remote already exists":

```powershell
git remote set-url origin https://github.com/shaharprod/voice-remote.git
git push -u origin main
```

## לאחר העלאה - הפעלת GitHub Pages:

1. לך ל: https://github.com/shaharprod/voice-remote/settings/pages
2. תחת "Source" בחר: **Deploy from a branch**
3. Branch: **main**, Folder: **/ (root)**
4. לחץ **Save**
5. האפליקציה תהיה זמינה ב: **https://shaharprod.github.io/voice-remote**

## הערות:

- ודא ש-Git מותקן: https://git-scm.com/
- אם תתבקש, הזן שם משתמש וסיסמה של GitHub
- עבור אימות מומלץ להשתמש ב-Personal Access Token במקום סיסמה

