@echo off
chcp 65001 > nul
title He Thong Tao va Gui Don Mua Hang VinFast DMS (PO Creator)
color 0b
echo ======================================================================
echo   HE THONG TAO VA GUI DON HANG MUA XE VINFAST DMS (PURCHASE ORDER)
echo ======================================================================
echo.
cd /d "%~dp0"
python dms_po_creator_app.py
pause
