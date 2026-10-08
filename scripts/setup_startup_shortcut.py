import os
import subprocess

startup_dir = os.path.join(os.environ['APPDATA'], r'Microsoft\Windows\Start Menu\Programs\Startup')
shortcut_path = os.path.join(startup_dir, 'CyberSoft_Sync_Daemon.lnk')
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
vbs_path = os.path.join(root_dir, 'chay_ngam_cyber_sync.vbs')

ps_code = f"""
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('{shortcut_path}')
$s.TargetPath = 'wscript.exe'
$s.Arguments = '"{vbs_path}"'
$s.WorkingDirectory = '{root_dir}'
$s.WindowStyle = 0
$s.Description = 'CyberSoft Local Server & Bridge Daemon (Chay Ngam)'
$s.Save()
Unblock-File -Path '{vbs_path}' -ErrorAction SilentlyContinue
Unblock-File -Path '{shortcut_path}' -ErrorAction SilentlyContinue
"""

res = subprocess.run(['powershell', '-NoProfile', '-Command', ps_code], capture_output=True, text=True)
if os.path.exists(shortcut_path):
    print(f"SUCCESS: Đã tạo shortcut tự khởi động ẩn ngầm tại:\n{shortcut_path}")
    print(f"Target: wscript.exe \"{vbs_path}\"")
    print("Đã tự động gỡ cờ cảnh báo bảo mật (Unblock-File) của Windows.")
else:
    print(f"ERROR: {res.stderr}")
