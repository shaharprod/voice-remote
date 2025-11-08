# 🚀 הפעלת האפליקציה ב-GitHub Pages

## שלבים מהירים:

### 1️⃣ העלה את הקבצים ל-GitHub
הרץ את הסקריפט: **`commit-and-push.bat`**

או ידנית:
```bash
git add .
git commit -m "תיקון תמיכה במכשירים ניידים + חיווי ויזואלי לשלטים + תמיכה במצלמות USB"
git push origin main
```

### 2️⃣ הפעל GitHub Pages

**דרך 1: דרך Settings (המומלץ)**
1. לך ל: https://github.com/shaharprod/voice-remote/settings/pages
2. תחת **"Source"** או **"Build and deployment"**:
   - בחר **"Deploy from a branch"** או **"Branch"**
   - Branch: **main**
   - Folder: **/ (root)**
3. לחץ **Save**
4. חכה 1-2 דקות

**דרך 2: דרך GitHub Actions (אוטומטי)**
1. לך ל: https://github.com/shaharprod/voice-remote/settings/pages
2. תחת **"Source"** בחר: **"GitHub Actions"**
3. לחץ **Save**
4. כל push חדש יעלה אוטומטית

### 3️⃣ גש לאפליקציה

לאחר הפעלה, האפליקציה תהיה זמינה ב:
**https://shaharprod.github.io/voice-remote**

## ✅ בדיקה

1. פתח את הקישור: https://shaharprod.github.io/voice-remote
2. בדוק שהאפליקציה נטענת
3. בדוק שהשלט הרחוק הויזואלי מוצג בלחיצה על "בחר"

## 🔧 פתרון בעיות

**אם האתר לא עולה:**
- חכה 2-3 דקות (GitHub Pages לוקח זמן)
- בדוק את ה-logs ב: https://github.com/shaharprod/voice-remote/actions
- ודא ש-index.html נמצא ב-root

**אם יש שגיאות:**
- בדוק את ה-console בדפדפן (F12)
- ודא שכל הקבצים הועלו (index.html, app.js, styles.css)

## 📱 תמיכה במכשירים ניידים

האפליקציה תומכת במכשירים ניידים:
- ✅ תמיכה ב-touch events
- ✅ רספונסיביות מלאה
- ✅ חיווי ויזואלי לכפתורים
- ✅ תמיכה במצלמות USB

## 🔗 קישורים שימושיים

- Repository: https://github.com/shaharprod/voice-remote
- Settings: https://github.com/shaharprod/voice-remote/settings
- Pages: https://github.com/shaharprod/voice-remote/settings/pages
- Actions: https://github.com/shaharprod/voice-remote/actions
- האפליקציה: https://shaharprod.github.io/voice-remote

