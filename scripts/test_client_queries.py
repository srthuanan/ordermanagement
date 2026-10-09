import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co").strip().rstrip('/')
ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("VITE_SUPABASE_SERVICE_KEY", "")

print("Testing with ANON_KEY...")
headers_anon = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}"
}

# 1. Test khoxe
res_khoxe = requests.get(f"{SUPABASE_URL}/rest/v1/khoxe?select=*&limit=5", headers=headers_anon)
print(f"khoxe status: {res_khoxe.status_code}")
if res_khoxe.status_code != 200:
    print(f"khoxe error: {res_khoxe.text}")
else:
    print(f"khoxe count: {len(res_khoxe.json())}")

# 2. Test donhang
res_donhang = requests.get(f"{SUPABASE_URL}/rest/v1/donhang?select=*&limit=5", headers=headers_anon)
print(f"donhang status: {res_donhang.status_code}")
if res_donhang.status_code != 200:
    print(f"donhang error: {res_donhang.text}")
else:
    print(f"donhang count: {len(res_donhang.json())}")

# 3. Test car_telemetry
res_tele = requests.get(f"{SUPABASE_URL}/rest/v1/car_telemetry?select=vin,lat,lng&limit=5", headers=headers_anon)
print(f"car_telemetry status: {res_tele.status_code}")
if res_tele.status_code != 200:
    print(f"car_telemetry error: {res_tele.text}")
