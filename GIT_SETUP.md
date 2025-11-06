# הוראות התחברות ל-GitHub

## שלב 1: אתחול Git Repository

פתח PowerShell או Command Prompt בתיקיית הפרויקט והרץ:

```bash
git init
```

## שלב 2: הוספת קבצים

```bash
git add .
```

## שלב 3: יצירת Commit ראשון

```bash
git commit -m "Initial commit - Voice Remote App"
```

## שלב 4: יצירת Repository ב-GitHub

1. היכנס ל-GitHub: https://github.com
2. לחץ על "+" בפינה הימנית העליונה
3. בחר "New repository"
4. הזן שם ל-repository (למשל: `voice-remote`)
5. אל תסמן "Initialize with README" (כבר יש לנו README)
6. לחץ על "Create repository"

## שלב 5: התחברות ל-Remote Repository

לאחר יצירת ה-repository, GitHub יציג לך הוראות. הרץ:

```bash
git remote add origin https://github.com/[USERNAME]/[REPOSITORY-NAME].git
```

החלף `[USERNAME]` ו-`[REPOSITORY-NAME]` בשם המשתמש שלך ושם ה-repository.

## שלב 6: העלאת הקוד

```bash
git branch -M main
git push -u origin main
```

## הערות

- אם אתה משתמש ב-SSH במקום HTTPS, השתמש ב:
  `git@github.com:[USERNAME]/[REPOSITORY-NAME].git`

- אם אתה צריך להגדיר Git בפעם הראשונה:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```

## הפעלת GitHub Pages

לאחר העלאת הקוד:

1. היכנס ל-repository ב-GitHub
2. לחץ על "Settings"
3. גלול למטה ל-"Pages"
4. תחת "Source" בחר "Deploy from a branch"
5. בחר branch: `main` ו-folder: `/ (root)`
6. לחץ על "Save"
7. האפליקציה תהיה זמינה ב: `https://[USERNAME].github.io/[REPOSITORY-NAME]`

