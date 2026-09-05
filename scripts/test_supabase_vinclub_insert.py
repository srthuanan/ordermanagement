import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

headers = {
    "apikey": APIKEY,
    "Authorization": f"Bearer {APIKEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates, return=representation"
}

# 1. Test fetching khachhang_vinclub
url_get = f"{SUPABASE_URL}/rest/v1/khachhang_vinclub?select=*"
resp_get = requests.get(url_get, headers=headers)
print("GET status:", resp_get.status_code)
print("GET content:", resp_get.text[:500])

# 2. Test inserting a test record into khachhang_vinclub
test_payload = [{
    "ma_khach_hang": "N319-TEST-00001",
    "ten_khach_hang": "NGUYỄN HỮU SƠN TEST",
    "so_dien_thoai": "0369099237",
    "ma_oneid": "0009308437",
    "vclub_user_id": "280708503158784",
    "hang_vinclub": "Gold",
    "da_xac_thuc": True
}]

url_post = f"{SUPABASE_URL}/rest/v1/khachhang_vinclub?on_conflict=ma_khach_hang"
resp_post = requests.post(url_post, headers=headers, json=test_payload)
print("POST status:", resp_post.status_code)
print("POST content:", resp_post.text)
