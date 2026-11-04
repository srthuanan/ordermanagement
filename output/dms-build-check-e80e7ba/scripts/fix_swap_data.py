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

def fix_interactions():
    # Update category = 'SWAP_REQUEST' for all SWAP_CAR rows
    url = f"{SUPABASE_URL}/rest/v1/interactions?category=eq.SWAP_CAR"
    res = requests.patch(url, headers=headers, json={"category": "SWAP_REQUEST"})
    print(f"PATCH status: {res.status_code}")
    
    # Verify count
    url_check = f"{SUPABASE_URL}/rest/v1/interactions?category=eq.SWAP_REQUEST&select=id,type,actor_name,metadata"
    check_res = requests.get(url_check, headers=headers)
    if check_res.status_code == 200:
        data = check_res.json()
        print(f"✅ Total SWAP_REQUEST rows in interactions table: {len(data)}")
        for d in data:
            print(" - Row:", d.get('id'), "Type:", d.get('type'), "Status:", d.get('metadata', {}).get('status'))
    else:
        print(f"❌ Error checking: {check_res.status_code} - {check_res.text}")

if __name__ == "__main__":
    fix_interactions()
