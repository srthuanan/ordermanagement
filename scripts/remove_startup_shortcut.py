import os

startup_dir = os.path.join(os.environ['APPDATA'], r'Microsoft\Windows\Start Menu\Programs\Startup')
shortcut_path = os.path.join(startup_dir, 'CyberSoft_PDF_AutoSync.lnk')

if os.path.exists(shortcut_path):
    os.remove(shortcut_path)
    print(f"SUCCESS: Da go bo tu khoi dong tai:\n{shortcut_path}")
else:
    print("THONG BAO: Chua co shortcut tu khoi dong nao duoc cai dat.")
