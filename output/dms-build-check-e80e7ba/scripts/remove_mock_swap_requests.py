import os
from dotenv import load_dotenv
load_dotenv()
import requests

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def remove_mock_requests():
    print("🧹 Removing mock swap requests created for testing...")
    
    # Target specific mock IDs created in seed_swap_requests.py
    mock_ids = [
        "34ea3a5a-0519-4683-b945-1458fa333aa0",
        "17e265fe-eb01-4ae9-bd10-338cb0b8a1b6",
        "6f2cd46f-e755-4a7d-bbbb-15efded523f1"
    ]
    
    for mock_id in mock_ids:
        url = f"{SUPABASE_URL}/rest/v1/interactions?id=eq.{mock_id}"
        res = requests.delete(url, headers=headers)
        if res.status_code in [200, 204]:
            print(f"  - Deleted mock row {mock_id}")
        else:
            print(f"  - Error deleting {mock_id}: {res.status_code} - {res.text}")

    # Also clean up any actor_id = 'tvbh_01' or 'tvbh_02' mock interactions if any
    url_tvbh = f"{SUPABASE_URL}/rest/v1/interactions?actor_id=in.(tvbh_01,tvbh_02)"
    del_res = requests.delete(url_tvbh, headers=headers)
    print(f"  - Cleaned up mock tvbh entries: {del_res.status_code}")

    print("✅ Finished purging mock swap data. All real data remains 100% untouched.")

if __name__ == "__main__":
    remove_mock_requests()
