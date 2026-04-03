import os
import requests
from dotenv import load_dotenv
import time

load_dotenv()

# Config
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GAS_DEPLOY_ID = "AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg"
GAS_URL = f"https://script.google.com/macros/s/{GAS_DEPLOY_ID}/exec"
BUCKET_NAME = "yeucauxhd-files"

def get_supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

def delete_supabase_folder(folder_prefix):
    """
    Xóa toàn bộ thư mục trên Supabase Storage bằng lệnh DELETE trực tiếp từ Python
    """
    if not folder_prefix.endswith('/'):
        folder_prefix += '/'
        
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}"
    
    # 1. Liệt kê file trong folder để lấy list paths
    list_url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    list_payload = {
        "prefix": folder_prefix,
        "limit": 100,
        "offset": 0,
        "sortBy": {"column": "name", "order": "asc"}
    }
    
    try:
        res = requests.post(list_url, headers=get_supabase_headers(), json=list_payload)
        if res.status_code == 200:
            files = res.json()
            if not files:
                print(f"    - Thư mục {folder_prefix} đã trống.")
                return True
            
            # 2. Xóa các file tìm thấy
            paths_to_delete = [f"{folder_prefix}{f['name']}" for f in files]
            del_res = requests.delete(url, headers=get_supabase_headers(), json={"prefixes": paths_to_delete})
            
            if del_res.status_code == 200:
                print(f"    ✓ Đã dọn sạch {len(paths_to_delete)} file trong {folder_prefix}")
                return True
            else:
                print(f"    ✗ Lỗi xóa file: {del_res.status_code} {del_res.text}")
        else:
            print(f"    ✗ Lỗi liệt kê file: {res.status_code}")
    except Exception as e:
        print(f"    ✗ Lỗi khi xóa thư mục: {str(e)}")
    return False

def main():
    print("=" * 60)
    print("🚀 BẮT ĐẦU DỌN DẸP TRIỆT ĐỂ SUPABASE → DRIVE (PYTHON DIRECT)")
    print("=" * 60)
    
    # 1. Tìm các đơn hàng còn link Supabase
    query_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?select=so_don_hang,url_hop_dong,url_de_nghi_xhd,url_hoa_don_da_xuat&or=(url_hop_dong.ilike.*supabase*,url_de_nghi_xhd.ilike.*supabase*,url_hoa_don_da_xuat.ilike.*supabase*)"
    
    try:
        resp = requests.get(query_url, headers=get_supabase_headers())
        if resp.status_code != 200:
            print(f"Lỗi truy vấn Supabase: {resp.text}")
            return
            
        orders = resp.json()
        print(f"Tìm thấy {len(orders)} đơn hàng cần dọn dẹp.")
        
        for i, order in enumerate(orders, 1):
            so_don_hang = order['so_don_hang'].strip()
            print(f"\n[{i}/{len(orders)}] Xử lý: {so_don_hang}")
            
            # Bước 1: Gọi GAS để move file sang Drive
            try:
                gas_resp = requests.post(f"{GAS_URL}?action=archiveOrderNow&orderNumber={so_don_hang}", allow_redirects=True)
                if gas_resp.status_code == 200:
                    print(f"  → GAS: Chuyển sang Drive thành công.")
                    
                    # Bước 2: Tự tay Python xóa thư mục trên Supabase để chắc chắn sạch
                    print(f"  → Supabase: Đang dọn dẹp thư mục...")
                    delete_supabase_folder(so_don_hang)
                else:
                    print(f"  → GAS Error: {gas_resp.status_code}")
            except Exception as e:
                print(f"  → Connection Error: {str(e)}")
            
            time.sleep(1) # Nghỉ chút cho ổn định

        print("\n" + "=" * 60)
        print("✅ HOÀN TẤT DỌN DẸP TỔNG LỰC!")
        print("=" * 60)

    except Exception as e:
        print(f"Lỗi: {str(e)}")

if __name__ == "__main__":
    main()
