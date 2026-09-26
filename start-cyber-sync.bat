@echo off
title CyberSync Local Server & Supabase Bridge
chcp 65001 > nul
cd /d "%~dp0"
echo ==================================================================
echo   DANG KHOI CHAY DICH VU CYBERSYNC LOCAL SERVER & SUPABASE BRIDGE
echo ==================================================================
echo   - Local HTTP Port: 3001
echo   - Cloud Bridge:    Supabase Realtime Channel 'cyber-realtime-bridge'
echo   - Tinh nang:       Tự động ưu tiên xử lý trực tiếp trên máy văn phòng,
echo                      Web GitHub Pages KHÔNG CẦN DÙNG RENDER!
echo   - PDF Daemon:      Tự động xuất và đồng bộ PDF phiếu Cyber gốc lên Cloud
echo ==================================================================
echo.
node server-cyber.mjs
pause
