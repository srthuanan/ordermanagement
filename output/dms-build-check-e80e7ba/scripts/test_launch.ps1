$pyw = 'C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\pythonw.exe'
$script = (Resolve-Path 'scripts\zalo_coc_watcher.py').Path
$dir = (Resolve-Path 'scripts').Path

Write-Host "Launching: $pyw with $script in $dir"
Start-Process $pyw -ArgumentList "`"$script`"" -WorkingDirectory $dir

Start-Sleep -Seconds 3

$p = Get-CimInstance Win32_Process -Filter "name = 'pythonw.exe'"
Write-Host "Found pythonw count: $($p.Count)"
foreach ($item in $p) {
    Write-Host "PID: $($item.ProcessId) | Cmd: $($item.CommandLine)"
}
