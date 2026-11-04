@echo off
title Trung Tam Giam Sat In An RICOH MP 5055
cd /d "%~dp0"

:: Kiem tra neu server chua chay thi khoi dong server thu nho
netstat -ano | findstr :8989 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [1/2] Dang khoi dong may chu giam sat in an...
    start /min "Ricoh_Print_Server" python ricoh_monitor_server.py
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] May chu giam sat dang hoat dong san.
)

:: Mo trinh duyet web
echo [2/2] Dang mo giao dien tren trinh duyet...
start http://localhost:8989
exit
