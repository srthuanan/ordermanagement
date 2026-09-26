import os
import subprocess

desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
proj_dir = r'C:\Users\USER\Documents\ordermanagement'

# Xóa các shortcut cũ nếu có
old_shortcuts = ['Dong Bo PDF CyberSoft.lnk', 'Cai Dat Tu Khoi Dong PDF.lnk']
for old in old_shortcuts:
    old_p = os.path.join(desktop, old)
    if os.path.exists(old_p):
        try:
            os.remove(old_p)
        except Exception:
            pass

shortcuts = [
    (
        'CyberSync Local & Bridge.lnk',
        os.path.join(proj_dir, 'start-cyber-sync.bat'),
        'Chay dich vu Cyber Local Server, Supabase Bridge va PDF Sync'
    ),
    (
        'Cai Dat Tu Khoi Dong Cyber.lnk',
        os.path.join(proj_dir, 'cai_dat_tu_khoi_dong.bat'),
        'Cai dat tu dong khoi dong cung Windows'
    )
]

for name, target, desc in shortcuts:
    lnk_path = os.path.join(desktop, name)
    ps = f"""
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut('{lnk_path}')
$sc.TargetPath = '{target}'
$sc.WorkingDirectory = '{proj_dir}'
$sc.Description = '{desc}'
$sc.Save()
"""
    subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)
    if os.path.exists(lnk_path):
        print(f"SUCCESS: Đã tạo {name} trên Desktop")
    else:
        print(f"FAILED: {name}")
