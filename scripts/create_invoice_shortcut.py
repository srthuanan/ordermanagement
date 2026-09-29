import os
import subprocess

desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
proj_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
lnk_path = os.path.join(desktop, 'Xuat Hoa Don DMS Fast-Track.lnk')
target = os.path.join(proj_dir, 'Chay_Tool_Xuat_Hoa_Don_DMS.bat')
desc = 'VinFast DMS - Xuat Hoa Don ARI Fast-Track'

ps = """
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut('""" + lnk_path + """')
$sc.TargetPath = '""" + target + """'
$sc.WorkingDirectory = '""" + proj_dir + """'
$sc.Description = '""" + desc + """'
$sc.Save()
"""
subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)
if os.path.exists(lnk_path):
    print("SUCCESS: Đã tạo shortcut 'Xuat Hoa Don DMS Fast-Track.lnk' trên Desktop")
else:
    print("FAILED")
