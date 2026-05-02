import requests

# Configuration
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
BUCKET = "yeucauxhd-files"
ORDER_NO = "N31913-VSO-26-03-0487"

def list_files(prefix):
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "prefix": f"{prefix}/",
        "limit": 100,
        "offset": 0,
        "sortBy": {"column": "name", "order": "asc"}
    }
    
    print(f"Listing files with prefix: {prefix}/")
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        files = response.json()
        if not files:
            print("Folder trống (hoặc không tồn tại).")
        for f in files:
            print(f"- {f.get('name')} (Size: {f.get('metadata', {}).get('size', 0)} bytes)")
        return files
    else:
        print(f"Lỗi: {response.status_code} - {response.text}")
        return None

if __name__ == "__main__":
    list_files(ORDER_NO)
