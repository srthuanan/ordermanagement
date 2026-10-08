Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod })[0]

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

try {
    [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
    $access = Await ($listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])

    if ($access -ne [Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus]::Allowed) {
        Write-Host "ERROR: Notification access not allowed"
        exit 1
    }

    $seenIds = @{}
    # Doc cac thong bao hien co de bo qua cac thong bao cu
    $initial = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
    foreach ($n in $initial) {
        $seenIds[$n.Id] = $true
    }

    Write-Host "LISTENER_READY"

    while ($true) {
        Start-Sleep -Milliseconds 1200
        $current = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
        foreach ($n in $current) {
            if (-not $seenIds.ContainsKey($n.Id)) {
                $seenIds[$n.Id] = $true
                $appName = $n.AppInfo.DisplayInfo.DisplayName
                if ($appName -match "(?i)zalo") {
                    $bindings = $n.Notification.Visual.Bindings
                    $tList = @()
                    foreach ($b in $bindings) {
                        $elements = $b.GetTextElements()
                        foreach ($el in $elements) {
                            if ($el.Text -and $el.Text.Trim().Length -gt 0) {
                                $tList += $el.Text.Trim()
                            }
                        }
                    }
                    if ($tList.Count -gt 0) {
                        $fullText = $tList -join " | "
                        Write-Host "ZALO_MSG:$fullText"
                    }
                }
            }
        }
    }
} catch {
    Write-Host "ERROR: $_"
    exit 1
}
