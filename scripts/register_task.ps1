$ErrorActionPreference = 'Stop'
$repoDir = Split-Path -Parent $PSScriptRoot
$batPath = Join-Path $repoDir "start-cyber-sync.bat"

Write-Host "Dang dang ky tac vu CyberSoft_Sync_Daemon..." -ForegroundColor Cyan
Write-Host "Duong dan bat: $batPath"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batPath`"" -WorkingDirectory $repoDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName "CyberSoft_Sync_Daemon" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force

Write-Host "`nDA DANG KY THANH CONG TAC VU VAO TASK SCHEDULER!" -ForegroundColor Green
Write-Host "He thong se tu dong khoi chay moi khi dang nhap Windows."
Start-Sleep -Seconds 3
