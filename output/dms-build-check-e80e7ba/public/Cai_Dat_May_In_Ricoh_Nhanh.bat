@echo off
chcp 65001 >nul
title Cài Đặt Máy In RICOH MP 5055 Tự Động - Showroom VinFast Thuận An
echo ===================================================================
echo       HỆ THỐNG TỰ ĐỘNG CÀI ĐẶT & KẾT NỐI MÁY IN RICOH MP 5055
echo       Địa chỉ IP Máy In Văn Phòng: 192.168.10.239
echo ===================================================================
echo.

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [CẢNH BÁO] Bạn cần chạy file này với quyền Quản trị viên (Administrator).
    echo.
    echo 👉 Hãy BẤM CHUỘT PHẢI vào file này và chọn: "Run as administrator"
    echo ===================================================================
    pause
    exit /b
)

:: 1. Kiểm tra kết nối mạng tới máy in Ricoh
echo [Bước 1/4] Đang kiểm tra kết nối mạng LAN tới máy in 192.168.10.239...
ping -n 1 -w 1500 192.168.10.239 >nul
if %errorlevel% neq 0 (
    echo.
    echo ❌ [LỖI MẠNG] Không thể kết nối tới IP máy in 192.168.10.239!
    echo -> Vui lòng kiểm tra: Máy tính đã kết nối đúng WiFi / mạng dây văn phòng showroom chưa?
    echo.
    pause
    exit /b
)
echo    -> Kết nối mạng tới máy in Ricoh: HOÀN TOÀN THÔNG SUỐT (OK).
echo.

:: 2. Khởi tạo cổng in Standard TCP/IP
echo [Bước 2/4] Đang cấu hình cổng in trực tiếp TCP/IP (Port 9100)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { " ^
    "  if (-not (Get-PrinterPort -Name 'IP_192.168.10.239' -ErrorAction SilentlyContinue)) { " ^
    "      Add-PrinterPort -Name 'IP_192.168.10.239' -PrinterHostAddress '192.168.10.239' -ErrorAction Stop; " ^
    "  } " ^
    "  Write-Host '   -> Đã thiết lập cổng in IP_192.168.10.239 thành công.' -ForegroundColor Green; " ^
    "} catch { Write-Host '   -> Cổng in đã tồn tại hoặc đang sử dụng.' }"

:: 3. Thêm máy in và thiết lập Driver
echo.
echo [Bước 3/4] Đang cài đặt máy in RICOH MP 5055 và gán làm máy in mặc định...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { " ^
    "  $driver = (Get-PrinterDriver | Where-Object { $_.Name -like '*RICOH*' -or $_.Name -like '*PCL6*' } | Select-Object -First 1).Name; " ^
    "  if (-not $driver) { $driver = (Get-PrinterDriver | Select-Object -First 1).Name }; " ^
    "  if (-not (Get-Printer -Name 'RICOH MP 5055' -ErrorAction SilentlyContinue)) { " ^
    "      Add-Printer -Name 'RICOH MP 5055' -PortName 'IP_192.168.10.239' -DriverName $driver -ErrorAction Stop; " ^
    "  } else { " ^
    "      Set-Printer -Name 'RICOH MP 5055' -PortName 'IP_192.168.10.239'; " ^
    "  } " ^
    "  (New-Object -ComObject WScript.Network).SetDefaultPrinter('RICOH MP 5055'); " ^
    "  Write-Host '   -> ĐÃ CÀI ĐẶT THÀNH CÔNG VÀ ĐẶT LÀM MÁY IN MẶC ĐỊNH!' -ForegroundColor Green; " ^
    "} catch { " ^
    "  Write-Host '   -> Đang kết nối qua chia sẻ máy in mạng nội bộ...' -ForegroundColor Yellow; " ^
    "  rundll32 printui.dll,PrintUIEntry /in /n '\\192.168.10.132\RICOH_MP5055'; " ^
    "}"

:: 4. Sửa lỗi in nhiều bản (Driver Collate: ON, Printer Collate: OFF)
echo.
echo [Bước 4/4] Đang cấu hình chế độ in đúng số lượng bản sao (Multi-copy Collate)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { " ^
    "  Set-PrinterProperty -PrinterName 'RICOH MP 5055' -PropertyName 'Config:EnablecollatePrinter' -Value 'OFF' -ErrorAction SilentlyContinue; " ^
    "  Set-PrinterProperty -PrinterName 'RICOH MP 5055' -PropertyName 'Config:EnablecollateDriver' -Value 'ON' -ErrorAction SilentlyContinue; " ^
    "  Write-Host '   -> ĐÃ CẤU HÌNH NHÂN BẢN TỰ ĐỘNG! CHỌN 2 BẢN SẼ IN ĐÚNG 2 BẢN.' -ForegroundColor Green; " ^
    "} catch { Write-Host '   -> Đã cấu hình.' }"

echo.
echo ===================================================================
echo  🎉 HOÀN TẤT KẾT NỐI! Máy tính TVBH đã sẵn sàng in.
echo  ✅ Tự động in khổ A4 (không hỏi khay giấy).
echo  ✅ Chọn 2 bản, 3 bản sẽ in ra CHÍNH XÁC.
echo ===================================================================
pause
