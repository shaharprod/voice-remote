# 🚀 הפעלה מהירה ב-GitHub Pages

## שלב 1: העלה את הקבצים ל-GitHub

הרץ את הסקריפט: **`commit-and-push.bat`**

או ידנית ב-PowerShell:
```powershell
cd "C:\Users\User\Downloads\voice remote"
.\commit-and-push.bat
```

## שלב 2: הפעל GitHub Pages

### דרך מהירה (מומלץ):

1. **לך ל:** https://github.com/shaharprod/voice-remote/settings/pages

2. **תחת "Source"** או **"Build and deployment"**:
   - בחר **"Deploy from a branch"** או **"Branch"**
   - Branch: **main**
   - Folder: **/ (root)**

3. **לחץ Save**

4. **חכה 1-2 דקות**

### דרך אוטומטית (GitHub Actions):

1. **לך ל:** https://github.com/shaharprod/voice-remote/settings/pages

2. **תחת "Source"** בחר: **"GitHub Actions"**

3. **לחץ Save**

4. **כל push חדש יעלה אוטומטית**

## שלב 3: גש לאפליקציה

לאחר הפעלה, האפליקציה תהיה זמינה ב:

**🌐 https://shaharprod.github.io/voice-remote**

## ✅ בדיקה

1. פתח את הקישור: https://shaharprod.github.io/voice-remote
2. בדוק שהאפליקציה נטענת
3. בדוק שהשלט הרחוק הויזואלי מוצג בלחיצה על "בחר" במכשיר

## 🔧 אם יש בעיות

**האתר לא עולה:**
- חכה 2-3 דקות (GitHub Pages לוקח זמן)
- בדוק את ה-logs: https://github.com/shaharprod/voice-remote/actions
- ודא ש-index.html נמצא ב-root

**יש שגיאות:**
- פתח את ה-console בדפדפן (F12)
- בדוק שכל הקבצים הועלו (index.html, app.js, styles.css)

## 📱 תמיכה במכשירים ניידים

האפליקציה תומכת במכשירים ניידים:
- ✅ תמיכה ב-touch events
- ✅ רספונסיביות מלאה
- ✅ חיווי ויזואלי לכפתורים
- ✅ תמיכה במצלמות USB

## 🔗 קישורים

- **Repository:** https://github.com/shaharprod/voice-remote
- **Settings:** https://github.com/shaharprod/voice-remote/settings
- **Pages:** https://github.com/shaharprod/voice-remote/settings/pages
- **Actions:** https://github.com/shaharprod/voice-remote/actions
- **האפליקציה:** https://shaharprod.github.io/voice-remote

