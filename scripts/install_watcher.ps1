$dir = 'C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts'
$startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\ZaloCocWatcher.bat'
Copy-Item (Join-Path $dir 'ZaloCocWatcher.bat') $startup -Force
Write-Host "Da cai dat vao Startup: $startup"

$desktop = Join-Path $env:USERPROFILE 'Desktop\Quan_Ly_Zalo_COC_Watcher.bat'
Copy-Item (Join-Path $dir 'Quan_Ly_Zalo_COC_Watcher.bat') $desktop -Force
Write-Host "Da tao file quan ly tren Desktop: $desktop"

# Dung tien trinh cu neu co
$pidFile = Join-Path $dir 'zalo_coc_watcher.pid'
if (Test-Path $pidFile) {
    $tPid = Get-Content $pidFile
    Stop-Process -Id $tPid -Force -ErrorAction SilentlyContinue
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
Get-CimInstance Win32_Process -Filter "CommandLine like '%zalo_coc_watcher.py%'" | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
}

# Khoi chay tien trinh moi bang WMI (sinh ra boi WmiPrvSE.exe, doc lap 100%)
$pyw = 'C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\pythonw.exe'
$script = Join-Path $dir 'zalo_coc_watcher.py'

$cmdLine = "`"$pyw`" `"$script`""
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = $cmdLine; CurrentDirectory = $dir} | Out-Null

Start-Sleep -Seconds 2

# Kiem tra tien trinh
$running = $null
if (Test-Path $pidFile) {
    $rPid = Get-Content $pidFile
    $running = Get-Process -Id $rPid -ErrorAction SilentlyContinue
}
if (-not $running) {
    $running = Get-CimInstance Win32_Process -Filter "name = 'pythonw.exe' and CommandLine like '%zalo_coc_watcher.py%'"
}

if ($running) {
    $watcherPid = if ($running.Id) { $running.Id } else { $running.ProcessId }
    Write-Host ">> TIEN TRINH DANG CHAY THANH CONG! PID: $watcherPid" -ForegroundColor Green
} else {
    Write-Host ">> CANH BAO: Chua thay tien trinh chay." -ForegroundColor Yellow
}

# In 5 dong log moi nhat
$logFile = Join-Path $dir 'zalo_coc_watcher.log'
if (Test-Path $logFile) {
    Write-Host "--- 5 dong log moi nhat ---"
    Get-Content $logFile -Tail 5
}
