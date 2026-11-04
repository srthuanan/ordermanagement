@echo off
set "PY=C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\pythonw.exe"
set "TARGET=C:\Users\Pham Thanh Nhan\Documents\ordermanagement\scripts\zalo_coc_watcher.py"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process -Filter \"name = 'pythonw.exe' and CommandLine like '%%zalo_coc_watcher.py%%'\"; if (-not $p) { Start-Process '%PY%' -ArgumentList '\"%TARGET%\"' -WindowStyle Hidden }"
