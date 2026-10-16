@echo off
title CyberSync Local Server ^& Supabase Bridge
chcp 65001 > nul
cd /d "%~dp0"
:loop
node server-cyber.mjs
ping 127.0.0.1 -n 6 > nul
goto loop

