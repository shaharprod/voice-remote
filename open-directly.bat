@echo off
echo פתיחת האפליקציה ישירות בדפדפן...
cd /d "%~dp0"
start index.html
echo.
echo האפליקציה נפתחה בדפדפן
echo.
echo הערה: חלק מהתכונות (WebUSB, Bluetooth) דורשות HTTPS או localhost
echo לכן מומלץ להריץ שרת מקומי במקום
echo.
pause

