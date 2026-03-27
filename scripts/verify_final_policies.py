import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

res = supabase.table("chinhsach").select("*").execute()
if res.data:
    print(f"Current Row Count: {len(res.data)}")
    sorted_p = sorted(res.data, key=lambda x: (x.get('ten_chinh_sach') or "").lower())
    for r in sorted_p:
        print(f"ID: {r['id'][:8]} | Name: '{r['ten_chinh_sach']}' | Model: '{r['dong_xe']}'")
else:
    print("No data.")
