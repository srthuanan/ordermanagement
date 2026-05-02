import requests

# Configuration
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
BUCKET = "temp_scans"

def purge_temp_scans():
    print("🧹 Đang liệt kê toàn bộ file trong bucket temp_scans...")
    
    url_list = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Liệt kê folder gốc (không prefix)
    response = requests.post(url_list, headers=headers, json={"prefix": "", "limit": 1000})
    
    if response.status_code != 200:
        print(f"❌ Lỗi: {response.status_code} - {response.text}")
        return
        
    files = response.json()
    if not files:
        print("✅ Bucket temp_scans đã sạch sẽ.")
        return
        
    filenames = [f['name'] for f in files if f['name'] != '.emptyKeep']
    print(f"🔍 Tìm thấy {len(filenames)} file tạm. Bắt đầu xóa...")
    
    # Xóa hàng loạt (Bulk Delete)
    url_delete = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}"
    # Chia nhỏ batch nếu quá nhiều (Supabase limits batch size)
    batch_size = 100
    for i in range(0, len(filenames), batch_size):
        batch = filenames[i:i + batch_size]
        del_res = requests.delete(url_delete, headers=headers, json={"prefixes": batch})
        if del_res.status_code == 200:
            print(f"  - Đã xóa batch {i//batch_size + 1} ({len(batch)} file)")
        else:
            print(f"  - ❌ Lỗi xóa batch {i//batch_size + 1}: {del_res.text}")

    print("🏁 Đã dọn dẹp xong bucket temp_scans.")

if __name__ == "__main__":
    purge_temp_scans()
