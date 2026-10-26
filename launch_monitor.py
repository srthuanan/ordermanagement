import os
import sys
import subprocess
import time
import urllib.request
import webbrowser

DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_SCRIPT = os.path.join(DIR, "ricoh_monitor_server.py")
URL = "http://localhost:8989"

def check_alive():
    try:
        with urllib.request.urlopen(f"{URL}/api/status", timeout=1) as resp:
            return resp.status == 200
    except:
        return False

def main():
    if not check_alive():
        DETACHED_PROCESS = 0x00000008
        CREATE_NEW_PROCESS_GROUP = 0x00000200
        
        # Khởi chạy server tách biệt hoàn toàn khỏi tiến trình gọi
        subprocess.Popen(
            ["pythonw", SERVER_SCRIPT],
            cwd=DIR,
            creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
            close_fds=True
        )
        
        # Chờ tối đa 3s cho server bind port thành công
        for _ in range(15):
            time.sleep(0.2)
            if check_alive():
                break

    # Mở trình duyệt web mặc định
    webbrowser.open(URL)

if __name__ == "__main__":
    main()
