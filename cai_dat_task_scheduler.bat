@echo off
title Cai Dat Windows Task Scheduler Cho CyberSync Daemon
chcp 65001 > nul
cd /d "%~dp0"

echo ==================================================================
echo   CAI DAT WINDOWS TASK SCHEDULER CHO CYBERSYNC & SUPABASE BRIDGE
echo ==================================================================
echo.
echo Dang yeu cau quyen Administrator (UAC)...
echo Vui long bam [Yes] tren hop thoai he thong neu co hoi.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0scripts\register_task.ps1\"\"' -Verb RunAs -Wait"

echo.
echo ==================================================================
echo   DA THUC HIEN XONG!
echo ==================================================================
pause
