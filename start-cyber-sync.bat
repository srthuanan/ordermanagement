@echo off
title CyberSync Local Server (Port 3001)
echo ===================================================
echo   DANG KHOI CHAY DICH VU CYBERSYNC LOCAL SERVER...
echo   Port: 3001
echo ===================================================
cd /d "%~dp0"
node server-cyber.mjs
pause
