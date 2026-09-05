import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

def fetch_table(table, select="*"):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    return resp.json() if resp.status_code == 200 else []

yeucauvc = fetch_table("yeucauvc")
khachhang_vc = fetch_table("khachhang_vinclub")

# Check status distribution in yeucauvc
statuses = {}
for y in yeucauvc:
    st = y.get("trang_thai_xu_ly") or "Chưa rõ"
    statuses[st] = statuses.get(st, 0) + 1

output = {
    "total_yeucauvc": len(yeucauvc),
    "status_distribution": statuses,
    "yeucauvc_list": yeucauvc,
    "total_khachhang_vinclub": len(khachhang_vc),
    "khachhang_vinclub_list": khachhang_vc
}

with open("scripts/vinclub_full_details.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"EXPORTED {len(yeucauvc)} yeucauvc records and {len(khachhang_vc)} khachhang_vinclub records to scripts/vinclub_full_details.json")
print("Status breakdown in yeucauvc:", statuses)
