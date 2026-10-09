$desktop = Join-Path $env:USERPROFILE 'Desktop\Quan_Ly_Zalo_COC_Watcher.bat'
Copy-Item 'scripts\Quan_Ly_Zalo_COC_Watcher.bat' $desktop -Force
Write-Host "Da cap nhat xong file Desktop: $desktop"

$pidFile = 'scripts\zalo_coc_watcher.pid'
if (Test-Path $pidFile) {
    $tPid = Get-Content $pidFile
    $p = Get-Process -Id $tPid -ErrorAction SilentlyContinue
    if ($p) {
        Write-Host ">> TIEN TRINH DANG CHAY NGAM (PID: $($p.Id))" -ForegroundColor Green
    } else {
        Write-Host ">> TIEN TRINH DANG DUNG (CHUA CHAY)" -ForegroundColor Yellow
    }
} else {
    Write-Host ">> CHUA CO FILE PID" -ForegroundColor Yellow
}
