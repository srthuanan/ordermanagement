@echo off
cd /d "C:\Users\Pham Thanh Nhan\Documents\ordermanagement"
chcp 65001 >nul
title QUET BIEN BAN COC THEO YEU CAU
color 0A

"C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\python.exe" "scripts\scan_coc_on_demand.py" %*

echo.
echo ================================================================
pause
