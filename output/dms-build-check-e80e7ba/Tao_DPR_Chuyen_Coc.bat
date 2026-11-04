@echo off
chcp 65001 > nul
title He Thong Tao DPR Chuyen Coc Hang Loat (DPR Creator)
color 0b
echo ======================================================================
echo   HE THONG TAO HANG LOAT DPR CHUYEN COC XE VINFAST DMS (DPR CREATOR)
echo ======================================================================
echo.
cd /d "%~dp0"
python dms_dpr_creator_app.py
pause
