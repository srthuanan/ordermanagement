@echo off
title CyberSync Local Server ^& Supabase Bridge
chcp 65001 > nul
cd /d "%~dp0"
echo ==================================================================
echo   DANG KHOI CHAY DICH VU CYBERSYNC LOCAL SERVER ^& SUPABASE BRIDGE
echo ==================================================================
echo   - Local HTTP Port: 3001
echo   - Cloud Bridge:    Supabase Realtime Channel 'cyber-realtime-bridge'
echo   - Tinh nang:       Tự động ưu tiên xử lý trực tiếp trên máy văn phòng,
echo                      Web GitHub Pages KHÔNG CẦN DÙNG RENDER!
echo   - PDF Daemon:      Tự động xuất và đồng bộ PDF phiếu Cyber gốc lên Cloud
echo ==================================================================
:loop
echo [%date% %time%] Dang khoi chay dich vu CyberSync...
node server-cyber.mjs
echo.
echo ==================================================================
echo [%date% %time%] CANH BAO: Dich vu da dung lai.
echo He thong se tu dong khoi dong lai sau 5 giay...
echo Nhan Ctrl+C de dung han.
echo ==================================================================
timeout /t 5 > nul
goto loop
