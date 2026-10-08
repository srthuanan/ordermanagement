@echo off
title CyberSync Local Server ^& Supabase Bridge
chcp 65001 > nul
cd /d "%~dp0"
if not exist "logs" mkdir "logs"
:loop
echo [%date% %time%] Dang khoi chay dich vu CyberSync... >> "logs\cyber_sync.log"
node server-cyber.mjs >> "logs\cyber_sync.log" 2>&1
timeout /t 5 > nul
goto loop
