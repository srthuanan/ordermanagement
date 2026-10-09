Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$zaloProcs = Get-Process -Name "Zalo" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
if (-not $zaloProcs) {
    Write-Host "Zalo main window not found"
    exit
}

$mainHwnd = $zaloProcs[0].MainWindowHandle
$root = [System.Windows.Automation.AutomationElement]::FromHandle($mainHwnd)
Write-Host "Root name: $($root.Current.Name)"

$condition = [System.Windows.Automation.Condition]::TrueCondition
$allElements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
Write-Host "Total UI elements in Zalo: $($allElements.Count)"

$texts = @()
for ($i = 0; $i -lt $allElements.Count; $i++) {
    $elem = $allElements[$i]
    $name = $elem.Current.Name
    if ($name -and $name.Trim().Length -gt 0) {
        $texts += $name
        if ($name -match "(?i)coc") {
            Write-Host "FOUND COC MATCH in UI: $name" -ForegroundColor Green
        }
    }
}
Write-Host "Total named elements: $($texts.Count)"
Write-Host "Sample 10 elements:" ($texts | Select-Object -First 10)
