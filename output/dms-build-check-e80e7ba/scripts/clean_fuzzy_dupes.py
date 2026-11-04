import os, re
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

def normalize(name):
    if not name: return ""
    # Lowercase
    n = name.lower()
    # Replace Vietnamese tones with base characters (optional but helpful)
    # For now, just remove common prefixes
    prefixes = ["chính sách ưu đãi", "chính sách", "ưu đãi", "chương trình", "tặng", "quà tặng"]
    for p in prefixes:
        if n.startswith(p):
            n = n[len(p):].strip()
    
    # Remove punctuation and extra spaces
    n = re.sub(r'[^\w\s]', '', n)
    n = " ".join(n.split())
    return n

def clean_fuzzy_duplicates():
    res = supabase.table("chinhsach").select("*").execute()
    if not res.data: return
    
    by_norm = defaultdict(list)
    for r in res.data:
        norm = normalize(r['ten_chinh_sach'])
        by_norm[norm].append(r)
        
    for norm, items in by_norm.items():
        if len(items) > 1:
            print(f"FUZZY DUPES FOUND for norm '{norm}':")
            for i in items:
                print(f"  - '{i['ten_chinh_sach']}' (ID: {i['id'][:8]})")
            
            # Keep the one with the longest name (usually more detailed)
            sorted_items = sorted(items, key=lambda x: len(x['ten_chinh_sach']), reverse=True)
            keep = sorted_items[0]
            to_delete = sorted_items[1:]
            
            # Merge models
            all_models = set()
            for item in items:
                if item.get('dong_xe'):
                    for m in item['dong_xe'].split(','):
                        all_models.add(m.strip())
            merged_models = ", ".join(sorted(list(all_models)))
            
            print(f"  -> Keeping '{keep['ten_chinh_sach']}', Merging others into it.")
            supabase.table("chinhsach").update({
                "dong_xe": merged_models
            }).eq("id", keep["id"]).execute()
            
            for d in to_delete:
                print(f"     Deleting {d['id'][:8]}")
                supabase.table("chinhsach").delete().eq("id", d["id"]).execute()

clean_fuzzy_duplicates()
print("Done.")
