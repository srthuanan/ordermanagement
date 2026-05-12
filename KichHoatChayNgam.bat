@echo off
title VINFO DMS AUTOPILOT 2.0
cls

:menu
cls
echo ============================================================
echo   HE THONG DONG BO DMS VINFAST AUTOPILOT 2.0 (WINDOWS)
echo ============================================================
echo.
echo  [1] Dang nhap tai khoan DMS VinFast (Chi can lam 1 lan dau)
echo  [2] Chay thu nghiem dong bo ngam ngay lap tuc
echo  [3] Dang ky chay ngam tu dong cung Windows (Moi 30 phut)
echo  [4] Xem lich su hoat dong dong bo (Log file)
echo  [5] Xoa lich chay ngam tu dong da dang ky
echo  [6] Thoat chuong trinh
echo.
echo ============================================================
set /p chon="Nhap lua chon cua ban (1-6): "

if "%chon%"=="1" goto login
if "%chon%"=="2" goto test_sync
if "%chon%"=="3" goto register_task
if "%chon%"=="4" goto view_log
if "%chon%"=="5" goto delete_task
if "%chon%"=="6" exit
goto menu

:login
cls
echo Dang kiem tra va cai dat cac thu vien Python can thiet...
pip install selenium requests
echo.
python "%~dp0scripts\win_dms_autopilot.py" --login
echo.
echo Bam phim bat ky de quay lai Menu chinh...
pause > nul
goto menu

:test_sync
cls
echo Dang chay thu nghiem dong bo ngam du lieu len Supabase...
echo.
python "%~dp0scripts\win_dms_autopilot.py" --sync
echo.
echo Bam phim bat ky de quay lai Menu chinh...
pause > nul
goto menu

:register_task
cls
echo Dang tien hanh dang ky lich chay ngam tu dong voi Windows...
echo.
schtasks /create /tn "VinfoDmsAutopilot" /tr "python \"%~dp0scripts\win_dms_autopilot.py\" --sync" /sc minute /mo 30 /f
echo.
echo ============================================================
echo  KICH HOAT CHAY NGAM THANH CONG!
echo ============================================================
echo  - Lich chay ngam moi 30 phut da duoc luu vao Windows Task Scheduler.
echo  - Ke tu bay gio, he thong se tu dong dong bo am tham duoi nen
echo    ma khong hien cua so va khong can ban thao tac gi them.
echo ============================================================
echo.
echo Bam phim bat ky de quay lai Menu chinh...
pause > nul
goto menu

:view_log
cls
echo Dang tai nhat ky hoat dong dong bo...
echo.
if exist "%~dp0scripts\autopilot_sync.log" (
    start notepad "%~dp0scripts\autopilot_sync.log"
) else (
    echo [!] Chua co lich su hoat dong nao duoc ghi lai.
)
echo.
echo Bam phim bat ky de quay lai Menu chinh...
pause > nul
goto menu

:delete_task
cls
echo Dang xoa lich chay ngam tu dong...
echo.
schtasks /delete /tn "VinfoDmsAutopilot" /f
echo.
echo Da huy dang ky chay ngam thanh cong!
echo.
echo Bam phim bat ky de quay lai Menu chinh...
pause > nul
goto menu
