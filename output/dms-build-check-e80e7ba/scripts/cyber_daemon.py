import subprocess
import time
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_BIN = shutil.which("node") or r"C:\Users\Pham Thanh Nhan\AppData\Roaming\fnm\aliases\default\node.exe"
server_mjs = os.path.join(BASE_DIR, "server-cyber.mjs")

while True:
    try:
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = 0  # SW_HIDE
        proc = subprocess.Popen(
            [NODE_BIN, server_mjs],
            cwd=BASE_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=0x08000000,
            startupinfo=startupinfo
        )
        proc.wait()
    except Exception:
        pass
    time.sleep(3)

