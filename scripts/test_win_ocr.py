import subprocess
import os

p = os.path.expandvars(r'%APPDATA%\ZaloData\media\2297773701172183608\ZaloDownloads\resource\g77085409175744202\Cache')
files = [os.path.join(p, f) for f in os.listdir(p) if f.endswith('_n')]
top = sorted(files, key=os.path.getmtime, reverse=True)[:5]

paths_arg = ";".join(top)

ps_script = """
param([string]$pathList)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($asyncOp, $type) {
    $asTask = $asTaskGeneric.MakeGenericMethod($type)
    $netTask = $asTask.Invoke($null, @($asyncOp))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) {
    $lang = [Windows.Globalization.Language]::new('en-US')
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
}

$paths = $pathList.Split(';')
foreach ($fp in $paths) {
    if (-not $fp) { continue }
    try {
        $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fp)) ([Windows.Storage.StorageFile])
        $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
        $txt = $result.Text -replace "`r?`n", " "
        $short = if ($txt.Length -gt 150) { $txt.Substring(0, 150) } else { $txt }
        Write-Host "FILE: $([System.IO.Path]::GetFileName($fp)) => $short"
    } catch {
        Write-Host "FILE: $([System.IO.Path]::GetFileName($fp)) => ERROR: $($_.Exception.Message)"
    }
}
"""

res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script, "-pathList", paths_arg], capture_output=True, text=True)
print("STDOUT:\n", res.stdout)
