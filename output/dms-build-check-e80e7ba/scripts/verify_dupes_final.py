import os
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import Counter

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

res = supabase.table("chinhsach").select("ten_chinh_sach").execute()
if res.data:
    names_lower = [r['ten_chinh_sach'].strip().lower() for r in res.data]
    counts = Counter(names_lower)
    dupes = [n for n, c in counts.items() if c > 1]
    
    if dupes:
        print(f"STILL HAVE DUPES (lower): {dupes}")
    else:
        print("NO DUPES FOUND BY LOWERCASE NAME.")
else:
    print("NO DATA.")
