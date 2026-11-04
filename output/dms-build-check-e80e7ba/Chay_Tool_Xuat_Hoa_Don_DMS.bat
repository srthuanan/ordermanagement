@echo off
chcp 65001 >nul
title VINFAST DMS - CONG CU XU LY DON HANG & XUAT HOA DON FAST-TRACK
cd /d "%~dp0"

echo ==============================================================================
echo   ⚡ VINFAST DMS - FAST-TRACK INVOICE AUTOMATOR (VSO -> VIN -> ARI)
echo   Chuan hoa quy trinh: Chon VSO - Ghep VIN - Khuyen mai - Duyet - Xuat ARI
echo ==============================================================================
echo.
echo Dang khoi dong giao dien ung dung...

python dms_vso_invoice_automator.py

if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong the khoi chay chuong trinh Python. Vui long kiem tra lai moi truong!
    pause
)
