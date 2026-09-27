@echo off
title Cai Dat Windows Task Scheduler Cho CyberSync Daemon
chcp 65001 > nul
cd /d "%~dp0"

echo ==================================================================
echo   CAI DAT WINDOWS TASK SCHEDULER CHO CYBERSYNC & SUPABASE BRIDGE
echo ==================================================================
echo.
echo Script se dang ky tac vu "CyberSoft_Sync_Daemon" vao Task Scheduler:
echo   - Tu dong chay moi khi mo may / dang nhap Windows
echo   - Chay voi quyen cao nhat (Highest Privileges)
echo   - Tu dong khoi phuc lai neu bi dong
echo   - Uu tien 100%% Local cho Web GitHub Pages (KHONG CAN DUNG RENDER)
echo.
echo Dang yeu cau quyen Administrator (UAC)...

set "BAT_PATH=%~dp0start-cyber-sync.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$bat = '%BAT_PATH%';" ^
  "$action = 'cmd.exe /c \"\"' + $bat + '\"\"';" ^
  "$cmd = 'schtasks /Create /TN \"\"CyberSoft_Sync_Daemon\"\" /TR \"\"' + $action + '\"\" /SC ONLOGON /RL HIGHEST /F';" ^
  "Start-Process cmd.exe -ArgumentList ('/c ' + $cmd + ' & echo. & echo DA CAI DAT THANH CONG! & pause') -Verb RunAs"

echo.
echo Vui long bam [Yes] tren hop thoai he thong de hoan tat.
pause
