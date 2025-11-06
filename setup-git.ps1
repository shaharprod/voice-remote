# סקריפט להגדרת Git ו-GitHub
# הרץ את הסקריפט הזה ב-PowerShell

Write-Host "🚀 מתחיל הגדרת Git..." -ForegroundColor Green

# בדיקה אם Git מותקן
try {
    $gitVersion = git --version
    Write-Host "✅ Git מותקן: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git לא מותקן. אנא התקן Git מ-https://git-scm.com/" -ForegroundColor Red
    exit
}

# אתחול repository
Write-Host "`n📦 מאתחל Git repository..." -ForegroundColor Yellow
git init

# הוספת קבצים
Write-Host "`n📝 מוסיף קבצים..." -ForegroundColor Yellow
git add .

# יצירת commit
Write-Host "`n💾 יוצר commit ראשון..." -ForegroundColor Yellow
git commit -m "Initial commit - Voice Remote App"

Write-Host "`n✅ Git repository מוכן!" -ForegroundColor Green
Write-Host "`n📋 השלבים הבאים:" -ForegroundColor Cyan
Write-Host "1. צור repository חדש ב-GitHub: https://github.com/new" -ForegroundColor White
Write-Host "2. הרץ את הפקודה הבאה (החלף USERNAME ו-REPO):" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/USERNAME/REPO.git" -ForegroundColor Yellow
Write-Host "3. הרץ:" -ForegroundColor White
Write-Host "   git branch -M main" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow

