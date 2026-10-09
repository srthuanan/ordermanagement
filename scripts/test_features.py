import subprocess

ps_code = """
try {
    [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
    $status = $listener.RequestAccessAsync().GetAwaiter().GetResult()
    Write-Host "Notification Listener status: $status"
    if ($status -eq "Allowed") {
        $notifs = $listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast).GetAwaiter().GetResult()
        Write-Host "Total Toast Notifications: $($notifs.Count)"
        foreach ($n in $notifs | Select-Object -First 5) {
            $app = $n.AppInfo.DisplayInfo.DisplayName
            $bindings = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
            if ($bindings) {
                $texts = $bindings.GetTextElements() | ForEach-Object { $_.Text }
                Write-Host "[$app] $($texts -join ' | ')"
            }
        }
    }
} catch {
    Write-Host "Error Listener:" $_.Exception.Message
}
"""

res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_code], capture_output=True, text=True)
print(res.stdout)

