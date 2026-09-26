import os
import subprocess

desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
proj_dir = r'C:\Users\USER\Documents\ordermanagement'

shortcuts = [
    (
        'Dong Bo PDF CyberSoft.lnk',
        os.path.join(proj_dir, 'chay_dong_bo_pdf_ngam.bat'),
        'Chay tien trinh dong bo PDF CyberSoft'
    ),
    (
        'Cai Dat Tu Khoi Dong PDF.lnk',
        os.path.join(proj_dir, 'cai_dat_tu_khoi_dong.bat'),
        'Cai dat tu dong dong bo PDF khi mo may'
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
