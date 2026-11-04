@echo off
cd /d "C:\Users\Pham Thanh Nhan\Documents\ordermanagement"
chcp 65001 >nul
title QUAN LY TIEN TRINH TU DONG QUET COC ZALO
color 0B

:MENU
cls
echo ================================================================
echo        HE THONG TU DONG THEO DOI BIEN BAN COC QUA ZALO
echo ================================================================
echo.
echo [1] Theo doi Nhat ky THOI GIAN THUC (Real-time Live Stream)
echo [2] Kiem tra nhanh Trang thai ^& 15 dong nhat ky gan nhat
echo [3] Khoi dong tien trinh chay ngam (Silent Background)
echo [4] Dung tien trinh chay ngam
echo [5] Chay thu nghiem truc tiep tren man hinh (Debug Mode)
echo [6] Thoat
echo.
echo ================================================================
set /p choice="Nhap lua chon cua ban (1-6): "

if "%choice%"=="1" goto LIVE
if "%choice%"=="2" goto STATUS
if "%choice%"=="3" goto START
if "%choice%"=="4" goto STOP
if "%choice%"=="5" goto DEBUG
if "%choice%"=="6" goto EXIT
goto MENU

:LIVE
cls
echo ================================================================
echo     THEO DOI NHAT KY THOI GIAN THUC (REAL-TIME LIVE LOG)
echo  --------------------------------------------------------------
echo  Bat ky anh nao gui vao Zalo hoac anh vua Bam 'Sao chep anh'
echo  se lap tuc hien thi chi tiet tung giay o ben duoi!
echo.
echo  Bam [Ctrl + C] roi go 'Y' de thoat ve Menu chinh.
echo ================================================================
echo.
powershell -NoProfile -Command "if (Test-Path 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.log') { Get-Content 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.log' -Wait -Tail 20 } else { Write-Host 'Chua co file log' }"
goto MENU

:STATUS
cls
echo --- TRANG THAI TIEN TRINH ---
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pidFile = 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.pid'; $p = $null; if (Test-Path $pidFile) { $tPid = Get-Content $pidFile; $p = Get-Process -Id $tPid -ErrorAction SilentlyContinue }; if ($p) { Write-Host ('>> DANG CHAY NGAM (PID: ' + $p.Id + ')') -ForegroundColor Green } else { Write-Host '>> DANG DUNG (CHUA CHAY)' -ForegroundColor Yellow }"
echo.
echo --- 15 DONG NHAT KY GAN NHAT ---
powershell -NoProfile -Command "if (Test-Path 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.log') { Get-Content 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.log' -Tail 15 } else { Write-Host 'Chua co file log' }"
echo.
pause
goto MENU

:START
cls
echo Dang khoi dong tien trinh chay ngam...
powershell -ExecutionPolicy Bypass -File "C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\install_watcher.ps1"
pause
goto MENU

:STOP
cls
echo Dang dung tien trinh...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pidFile = 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.pid'; if (Test-Path $pidFile) { $tPid = Get-Content $pidFile; Stop-Process -Id $tPid -Force -ErrorAction SilentlyContinue; Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }; Get-CimInstance Win32_Process -Filter \"CommandLine like '%%zalo_coc_watcher.py%%'\" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Write-Host '>> Da dung toan bo tien trinh!' -ForegroundColor Green"
pause
goto MENU

:DEBUG
cls
echo Dang khoi chay che do Debug (Nhan Ctrl+C de dung)...
"C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\python.exe" "C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.py"
pause
goto MENU

:EXIT
exit
