@echo off
title CyberSoft PDF Auto-Sync Daemon
chcp 65001 > nul
cd /d "%~dp0"
echo ==================================================================
echo   KICH HOAT TIEN TRINH TU DONG DONG BO PHIEU CYBERSOFT LEN CLOUD
echo ==================================================================
echo Tien trinh nay se tu dong quet lien tuc cac phieu moi (DNX, TD4) tu CyberSoft,
echo tao file PDF goc va day len Supabase Storage ngay tuc thi (moi 15 giay).
echo Nho do, vua tao phieu xong la co file xem/in lien tuc khac!
echo.
echo Khong tat cua so nay neu muon duy tri dong bo lien tuc!
echo ==================================================================
echo.

python scripts\watch_and_sync_cyber_pdfs.py --interval 15 --limit 30 --max-export 10
pause
