import requests

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

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
