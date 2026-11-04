import os

startup_dir = os.path.join(os.environ['APPDATA'], r'Microsoft\Windows\Start Menu\Programs\Startup')

for name in ['CyberSoft_Sync_Daemon.lnk', 'CyberSoft_PDF_AutoSync.lnk']:
    p = os.path.join(startup_dir, name)
    if os.path.exists(p):
        os.remove(p)
        print(f"SUCCESS: Da go bo tu khoi dong tai:\n{p}")
