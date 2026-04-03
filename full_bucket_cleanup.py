import os
import requests
from dotenv import load_dotenv
import time

load_dotenv()

# Config
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET_NAME = "yeucauxhd-files"

def get_supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

def list_root_folders():
    """Liệt kê các thư mục ở root của bucket"""
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    payload = {
        "prefix": "",
        "limit": 1000,
        "offset": 0,
        "sortBy": {"column": "name", "order": "asc"}
    }
    try:
        res = requests.post(url, headers=get_supabase_headers(), json=payload)
        if res.status_code == 200:
            # Folder là những item không có id
            return [item['name'] for item in res.json() if item.get('id') is None]
        else:
            print(f"Lỗi list folders: {res.status_code}")
            return []
    except Exception as e:
        print(f"Lỗi kết nối: {str(e)}")
        return []

def delete_entire_folder(folder_name):
    """Xóa sạch mọi thứ trong folder và folder đó"""
    prefix = folder_name if folder_name.endswith('/') else folder_name + '/'
    
    # 1. Lấy list file trong folder
    list_url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    payload = {"prefix": prefix, "limit": 100}
    
    res = requests.post(list_url, headers=get_supabase_headers(), json=payload)
    if res.status_code == 200:
        files = res.json()
        if not files:
            print(f"  ✓ {folder_name} đã trống.")
            return
        
        paths = [f"{prefix}{f['name']}" for f in files]
        # 2. Xóa sạch
        del_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}"
        del_res = requests.delete(del_url, headers=get_supabase_headers(), json={"prefixes": paths})
        if del_res.status_code == 200:
            print(f"  ✓ Đã xóa xong thư mục: {folder_name} ({len(paths)} files)")
        else:
            print(f"  ✗ Lỗi xóa {folder_name}: {del_res.status_code}")

def main():
    print("=" * 60)
    print("🔥 QUÉT & DỌN SẠCH TOÀN BỘ KHO SUPABASE STORAGE")
    print("=" * 60)
    
    folders = list_root_folders()
    print(f"Tìm thấy {len(folders)} thư mục trong kho '{BUCKET_NAME}'.")
    
    if not folders:
        print("Kho sạch sẽ! Không có gì để dọn.")
        return

    for i, folder in enumerate(folders, 1):
        # Bỏ qua các thư mục hệ thống nếu có (ví dụ broadcasts)
        if folder.lower() in ['broadcasts', '.empty']:
            continue
            
        print(f"[{i}/{len(folders)}] Đang xóa: {folder}...")
        delete_entire_folder(folder)
        time.sleep(0.5)

    print("\n" + "=" * 60)
    print("✨ HOÀN TẤT! KHO SUPABASE ĐÃ ĐƯỢC DỌN SẠCH.")
    print("=" * 60)

if __name__ == "__main__":
    main()
