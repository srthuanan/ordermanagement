import os
from dotenv import load_dotenv
load_dotenv()
import requests

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")
BUCKET = "temp_scans"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def list_files_recursive(prefix=""):
    url_list = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    payload = {"prefix": prefix, "limit": 1000, "sortBy": {"column": "name", "order": "asc"}}
    res = requests.post(url_list, headers=headers, json=payload)
    if res.status_code != 200:
        print(f"❌ Error listing {prefix}: {res.status_code} - {res.text}")
        return []
    
    items = res.json()
    all_files = []
    for item in items:
        name = item['name']
        full_path = f"{prefix}/{name}" if prefix else name
        # If id is null, it's a subfolder
        if item.get('id') is null if 'null' in str(type(None)) else item.get('id') is None:
            all_files.extend(list_files_recursive(full_path))
        else:
            all_files.append(full_path)
    return all_files

def purge_all():
    print("🧹 Listing all recursive files in temp_scans bucket...")
    files = list_files_recursive("")
    print(f"🔍 Found {len(files)} total files in temp_scans bucket.")
    
    if not files:
        print("✅ Bucket temp_scans is already completely empty.")
        return

    url_delete = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}"
    batch_size = 100
    for i in range(0, len(files), batch_size):
        batch = files[i:i + batch_size]
        res = requests.delete(url_delete, headers=headers, json={"prefixes": batch})
        if res.status_code == 200:
            print(f"  - Deleted batch {i//batch_size + 1} ({len(batch)} files)")
        else:
            print(f"  - ❌ Error deleting batch: {res.text}")

    print("🏁 Cleaned up all temporary scan files.")

if __name__ == "__main__":
    purge_all()
