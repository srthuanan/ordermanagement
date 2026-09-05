import requests
import json

url = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
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
