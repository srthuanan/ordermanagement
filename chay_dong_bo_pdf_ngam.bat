@echo off
title CyberSoft PDF Auto-Sync Daemon
chcp 65001 > nul
cd /d "%~dp0"
echo ==================================================================
echo   KICH HOAT TIEN TRINH TU DONG DONG BO PHIEU CYBERSOFT LEN CLOUD
echo ==================================================================
echo Tien trinh nay se tu dong quet cac phieu moi (DNX, TD4) tu CyberSoft,
echo tao file PDF goc va day len Supabase Storage moi 1 phut.
echo Nho do, moi nguoi xem tren dien thoai/may tinh khac deu xem duoc ngay.
echo.
echo Khong tat cua so nay neu muon duy tri dong bo lien tuc!
echo ==================================================================
echo.

python scripts\watch_and_sync_cyber_pdfs.py --interval 60 --limit 60 --max-export 30
pause
