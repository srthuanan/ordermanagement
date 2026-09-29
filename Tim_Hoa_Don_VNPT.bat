@echo off
chcp 65001 > nul
title He Thong Tra Cuu Hoa Don VNPT Theo So VIN (Green SM / VinFast)
color 0b
echo ======================================================================
echo   HE THONG TRA CUU HOA DON VNPT THEO SO VIN - GREEN SM / VINFAST
echo ======================================================================
echo.
cd /d "%~dp0"
python vnpt_invoice_finder_app.py
pause
