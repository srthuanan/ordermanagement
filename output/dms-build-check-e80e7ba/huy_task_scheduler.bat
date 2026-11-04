@echo off
title Huy Dang Ky Windows Task Scheduler CyberSync Daemon
chcp 65001 > nul
cd /d "%~dp0"

echo ==================================================================
echo   HUY DANG KY WINDOWS TASK SCHEDULER CYBERSYNC DAEMON
echo ==================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process cmd.exe -ArgumentList '/c schtasks /Delete /TN \"\"CyberSoft_Sync_Daemon\"\" /F & echo. & echo DA XOA TAC VU TASK SCHEDULER THANH CONG! & pause' -Verb RunAs"

pause
