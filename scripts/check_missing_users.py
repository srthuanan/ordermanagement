import os
from dotenv import load_dotenv
load_dotenv()
import requests
import json
import unicodedata

url = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
key = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

res = requests.get(f"{url}/rest/v1/users?select=username,full_name,role,manager_id", headers=headers)
users = res.json() if res.status_code == 200 else []

print("=== CURRENT USERS IN DB ===")
for u in users:
    print(f"username: {u['username']:<12} | full_name: {u.get('full_name'):<28} | role: {u.get('role'):<24} | manager_id: {u.get('manager_id')}")

missing_names = ["LÊ THANH HẢO", "LÊ THỊ HUYỀN TRANG", "LÊ THỊ THÚY NGA", "SẨM MINH PHÁT"]

print("\n=== CHECKING FOR MISSING USERS ===")
for m in missing_names:
    found = False
    for u in users:
        fn = u.get('full_name', '')
        if m in fn or fn in m:
            print(f"Match found for '{m}': {u}")
            found = True
    if not found:
        print(f"NOT FOUND: '{m}'")
