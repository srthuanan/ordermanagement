@echo off
title Nhat Ky Hoat Dong CyberSoft Sync Live
chcp 65001 > nul
cd /d "%~dp0"
echo ==================================================================
echo   DANG THEO DOI NHAT KY HOAT DONG CYBERSOFT SYNC (CHAY NGAM)
echo   (Dong cua so nay se KHONG lam anh huong den tien trinh ngam)
echo ==================================================================
echo.
if not exist "logs\cyber_sync.log" (
    echo Chua tim thay file log hoat dong. Vui long cho trong giay lat...
)
powershell -NoProfile -Command "Get-Content -Path 'logs\cyber_sync.log' -Wait -Tail 30 -ErrorAction SilentlyContinue"
pause
