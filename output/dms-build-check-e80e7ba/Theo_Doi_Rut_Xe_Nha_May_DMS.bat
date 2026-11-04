@echo off
chcp 65001 > nul
title He Thong Theo Doi Tien Do Rut Xe Nha May VinFast Hai Phong - DMS
color 0b
echo ======================================================================
echo   HE THONG THEO DOI TIEN DO RUT XE NHA MAY HAI PHONG (FACTORY RADAR)
echo ======================================================================
echo.
cd /d "%~dp0"
python dms_factory_stock_tracker.py
pause

