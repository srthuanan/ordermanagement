# 1. Kill any existing watcher processes
Get-CimInstance Win32_Process -Filter "CommandLine like '%zalo_coc_watcher.py%'" | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
    Write-Host ("Stopped process " + $_.ProcessId)
}

# 2. Remove PID file
$pidPath = Join-Path $PSScriptRoot 'zalo_coc_watcher.pid'
if (Test-Path $pidPath) {
    Remove-Item $pidPath -Force
    Write-Host "Removed PID file"
}

# 3. Remove from Windows Startup folder
$startupBat = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\ZaloCocWatcher.bat'
if (Test-Path $startupBat) {
    Remove-Item $startupBat -Force
    Write-Host "Removed from Startup: ZaloCocWatcher.bat"
}

# 4. Copy on-demand scanner to Desktop
$desktopScan = Join-Path $env:USERPROFILE 'Desktop\Quet_COC_Ngay.bat'
$sourceBat = Join-Path $PSScriptRoot 'Quet_COC_Ngay.bat'
Copy-Item $sourceBat $desktopScan -Force
Write-Host "Copied Quet_COC_Ngay.bat to Desktop"

# 5. Clean Desktop old watcher manager if present
$oldDesktopBat = Join-Path $env:USERPROFILE 'Desktop\Quan_Ly_Zalo_COC_Watcher.bat'
if (Test-Path $oldDesktopBat) {
    Remove-Item $oldDesktopBat -Force
    Write-Host "Removed old Desktop watcher manager"
}

Write-Host "SUCCESS: Auto COC watcher is completely disabled!"
