@echo off
chcp 65001 >nul
title [LIVE] THEO DOI THAO TAC DMS THOI GIAN THUC
cd /d "%~dp0"

echo ==============================================================================
echo   📡 DANG KHOI DONG TRINH THEO DOI DMS THOI GIAN THUC...
echo ==============================================================================

python scratch/monitor_dms_live.py

pause
