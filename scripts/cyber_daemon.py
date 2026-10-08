import subprocess
import time
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "cyber_sync.log")

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] [Daemon] {msg}\n")

log("🚀 Khởi chạy CyberSoft Sync Daemon ngầm...")

import shutil
NODE_BIN = shutil.which("node") or r"C:\Users\Pham Thanh Nhan\AppData\Roaming\fnm\aliases\default\node.exe"
server_mjs = os.path.join(BASE_DIR, "server-cyber.mjs")

while True:
    try:
        log(f"Đang chạy node server-cyber.mjs bằng {NODE_BIN}...")
        with open(LOG_FILE, "a", encoding="utf-8") as log_out:
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0  # SW_HIDE
            proc = subprocess.Popen(
                [NODE_BIN, server_mjs],
                cwd=BASE_DIR,
                stdout=log_out,
                stderr=log_out,
                stdin=subprocess.DEVNULL,
                creationflags=0x08000000,
                startupinfo=startupinfo
            )
            proc.wait()
        log(f"server-cyber.mjs kết thúc (code {proc.returncode}). Tự khởi động lại sau 3s...")
    except Exception as e:
        log(f"Lỗi daemon: {e}")
    time.sleep(3)
