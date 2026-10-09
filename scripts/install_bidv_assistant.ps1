$dir = 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts'
$startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\BidvAssistant.bat'

$batContent = @"
@echo off
start "" "C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\pythonw.exe" "C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\bidv_assistant_service.py"
exit
"@

Set-Content -Path $startup -Value $batContent -Encoding UTF8 -Force
Write-Host "Da cai dat vao Startup: $startup"

# Dung tien trinh cu neu co
Get-CimInstance Win32_Process -Filter "CommandLine like '%bidv_assistant_service.py%'" | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
}

# Khoi chay tien trinh moi bang WMI
$pyw = 'C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\pythonw.exe'
$script = Join-Path $dir 'bidv_assistant_service.py'
$cmdLine = "`"$pyw`" `"$script`""
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = $cmdLine; CurrentDirectory = $dir} | Out-Null

Start-Sleep -Seconds 2

$running = Get-CimInstance Win32_Process -Filter "name = 'pythonw.exe' and CommandLine like '%bidv_assistant_service.py%'"
if ($running) {
    Write-Host ">> TRO LY BIDV DANG CHAY NGAM THANH CONG! PID: $($running.ProcessId)" -ForegroundColor Green
} else {
    Write-Host ">> CANH BAO: Chua thay tien trinh chay." -ForegroundColor Yellow
}
