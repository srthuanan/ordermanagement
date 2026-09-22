import os
from dotenv import load_dotenv
load_dotenv()
import requests
import json

url = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
key = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

missing_users = [
    {"username": "haolt", "password_hash": "INVITED_VIA_AUTH", "full_name": "LÊ THANH HẢO", "role": "Tư vấn bán hàng", "manager_id": "phucnh"},
    {"username": "tranglth", "password_hash": "INVITED_VIA_AUTH", "full_name": "LÊ THỊ HUYỀN TRANG", "role": "Tư vấn bán hàng", "manager_id": "phucnh"},
    {"username": "ngaltt", "password_hash": "INVITED_VIA_AUTH", "full_name": "LÊ THỊ THÚY NGA", "role": "Tư vấn bán hàng", "manager_id": "phucnh"},
    {"username": "phatsm", "password_hash": "INVITED_VIA_AUTH", "full_name": "SẨM MINH PHÁT", "role": "Tư vấn bán hàng", "manager_id": "phucnh"}
]

for u in missing_users:
    res = requests.post(f"{url}/rest/v1/users", headers=headers, json=u)
    print(f"Creating user {u['full_name']} ({u['username']}): status {res.status_code}")
    if res.status_code not in (200, 201):
        print("Response:", res.text)
