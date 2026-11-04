import sys
import os

# Nạp thư mục gốc vào sys.path để import cyber_server và scripts
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

os.environ["IS_VERCEL_SERVERLESS"] = "1"

# Import handler chính từ cyber_server
from cyber_server import CyberApiHandler

# Vercel Serverless Function entry point
class handler(CyberApiHandler):
    pass
