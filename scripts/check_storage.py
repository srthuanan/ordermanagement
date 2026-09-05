import urllib.request
import json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def list_all_temp_scans():
    url = f"{SUPABASE_URL}/storage/v1/object/list/temp_scans"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    
    # List everything under temp_scans
    data = json.dumps({
        "prefix": "",
        "limit": 100,
        "offset": 0,
        "sortBy": {"column": "name", "order": "asc"}
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    total_files = 0
    folders = []
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            for item in result:
                if item.get("id") is None:
                    folders.append(item.get("name"))
                else:
                    total_files += 1
            
            print(f"Có tổng cộng {total_files} file nằm ở thư mục gốc của temp_scans.")
            print(f"Các thư mục con hiện có: {folders}")
            
            # Now let's recursively count files in folders
            for folder in folders:
                count = count_files_in_folder(folder)
                total_files += count
                print(f"Thư mục '{folder}' có {count} file.")
                
            print(f"\n=> TỔNG CỘNG TRONG TOÀN BỘ temp_scans CÓ: {total_files} file rác.")
            
    except Exception as e:
        print(f"Lỗi: {e}")

def count_files_in_folder(folder_name):
    url = f"{SUPABASE_URL}/storage/v1/object/list/temp_scans"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    data = json.dumps({
        "prefix": folder_name,
        "limit": 1000,
        "offset": 0,
        "sortBy": {"column": "name", "order": "asc"}
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return len([f for f in result if f.get("id") is not None])
    except:
        return 0

if __name__ == "__main__":
    list_all_temp_scans()
