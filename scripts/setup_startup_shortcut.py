import os
import subprocess

startup_dir = os.path.join(os.environ['APPDATA'], r'Microsoft\Windows\Start Menu\Programs\Startup')
shortcut_path = os.path.join(startup_dir, 'CyberSoft_PDF_AutoSync.lnk')
target_bat = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'chay_dong_bo_pdf_ngam.bat'))
working_dir = os.path.dirname(target_bat)

ps_code = f"""
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('{shortcut_path}')
$s.TargetPath = '{target_bat}'
$s.WorkingDirectory = '{working_dir}'
$s.WindowStyle = 7
$s.Description = 'CyberSoft PDF AutoSync Daemon'
$s.Save()
"""

res = subprocess.run(['powershell', '-NoProfile', '-Command', ps_code], capture_output=True, text=True)
if os.path.exists(shortcut_path):
    print(f"SUCCESS: Đã tạo shortcut tự khởi động tại:\n{shortcut_path}")
    print(f"Target: {target_bat}")
else:
    print(f"ERROR: {res.stderr}")
