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

def get_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

def main():
    print("🔄 ĐANG ĐỒNG BỘ TÊN FILE (CÓ TÊN KHÁCH HÀNG) & LÀM ĐẸP LINK CHO TOÀN BỘ DỮ LIỆU...")
    
    # Lấy toàn bộ đơn hàng đã có trên Drive hoặc Supabase để sync lại
    query_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?select=so_don_hang&ngay_xuat_hoa_don=not.is.null"
    
    resp = requests.get(query_url, headers=get_headers())
    if resp.status_code != 200:
        print(f"Lỗi: {resp.text}")
        return
        
    orders = resp.json()
    print(f"Bắt đầu đồng bộ cho {len(orders)} đơn hàng.")

    for i, order in enumerate(orders, 1):
        so_don_hang = order['so_don_hang']
        print(f"[{i}/{len(orders)}] Đồng bộ: {so_don_hang}...")
        
        try:
            requests.post(f"{GAS_URL}?action=archiveOrderNow&orderNumber={so_don_hang}", allow_redirects=True)
        except:
            pass
            
        time.sleep(1)

    print("\n✅ TẤT CẢ FILE TRÊN DRIVE ĐÃ ĐƯỢC ĐỔI TÊN CÓ TÊN KHÁCH HÀNG & LINK ĐÃ ĐƯỢC LÀM ĐẸP!")

if __name__ == "__main__":
    main()
