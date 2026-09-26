@echo off
title Cai dat Tu Khoi Dong CyberSync Daemon & Bridge
chcp 65001 > nul
cd /d "%~dp0"

echo ==================================================================
echo   CAI DAT TU KHOI DONG DICH VU CYBERSYNC & SUPABASE BRIDGE
echo ==================================================================
echo.
echo Tien trinh se tu dong khoi dong ngam moi khi mo may tinh Windows:
echo   1. Ket noi truc tiep SQL Cyber qua Local Port 3001
echo   2. Tu dong uu tien phuc vu Web GitHub Pages (KHONG DUNG RENDER)
echo   3. Tu dong quet va xuat file PDF goc (DNX, TD4) len Supabase Storage
echo.
python scripts\setup_startup_shortcut.py
echo.
echo ==================================================================
pause
