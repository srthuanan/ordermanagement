import urllib.request
import json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def get_all_items(prefix=""):
    url = f"{SUPABASE_URL}/storage/v1/object/list/temp_scans"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    data = json.dumps({
        "prefix": prefix,
        "limit": 1000,
        "offset": 0,
        "sortBy": {"column": "name", "order": "asc"}
    }).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Lỗi khi list file prefix '{prefix}': {e}")
        return []

def get_all_files_recursive(prefix=""):
    items = get_all_items(prefix)
    files = []
    
    for item in items:
        if prefix == "" and item.get("name") == "rescan":
            continue
            
        item_path = f"{prefix}{item.get('name')}" if prefix else item.get('name')
        
        if item.get("id") is None:
            files.extend(get_all_files_recursive(f"{item_path}/"))
            files.append(f"{item_path}/.emptyFolderPlaceholder") 
        else:
            files.append(item_path)
            
    return files

def delete_files(files):
    if not files:
        return 0
        
    url = f"{SUPABASE_URL}/storage/v1/object/temp_scans"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    
    batch_size = 100
    deleted_count = 0
    for i in range(0, len(files), batch_size):
        batch = files[i:i + batch_size]
        data = json.dumps({"prefixes": batch}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method='DELETE')
        
        try:
            with urllib.request.urlopen(req) as response:
                json.loads(response.read().decode('utf-8'))
                deleted_count += len(batch)
        except Exception as e:
            print(f"❌ Lỗi khi xóa batch: {e}")
            
    return deleted_count

if __name__ == "__main__":
    total_deleted = 0
    print("Bắt đầu vòng lặp xóa toàn bộ rác...")
    while True:
        all_files = get_all_files_recursive()
        if len(all_files) == 0:
            break
        print(f"Đã lấy {len(all_files)} file. Tiến hành xóa...")
        deleted = delete_files(all_files)
        total_deleted += deleted
        print(f"Đã xóa được {total_deleted} file...")
        
    print(f"Hoàn tất! Tổng cộng đã dọn dẹp sạch sẽ {total_deleted} file rác.")
