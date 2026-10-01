@echo off
chcp 65001 >nul
title VinFast Thuan An - Cong Dieu Hanh Du Phong Khan Cap (Standby Web)
color 0b

echo ======================================================================
echo    VINFAST THUAN AN - CONG DIEU HANH DU PHONG KHAN CAP (STANDBY)
echo ======================================================================
echo.
echo [*] Dang khoi dong Web con du phong (Chong nghen mang / sập he thong)...
echo [*] He thong se tu dong mo trinh duyet tai: http://localhost:5180
echo.

cd /d "%~dp0emergency-web"

start "" http://localhost:5180
node server.js

pause
