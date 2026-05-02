import os
import requests
import json
from time import sleep

# Configuration
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
GAS_URL = "https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec"

def get_orders_to_cleanup():
    print("🔍 Đang tìm kiếm các đơn hàng cần dọn dẹp trên Supabase...")
    # Lấy các đơn hàng có ít nhất một link từ Supabase
    query_params = "url_hop_dong=ilike.*supabase.co*&url_de_nghi_xhd=ilike.*supabase.co*&url_hoa_don_da_xuat=ilike.*supabase.co*"
    # Or query separately and combine for safety
    
    url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?select=so_don_hang,url_hop_dong,url_de_nghi_xhd,url_hoa_don_da_xuat"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"❌ Lỗi truy vấn Supabase: {response.status_code} - {response.text}")
        return []
    
    records = response.json()
    targets = []
    for r in records:
        needs_migration = False
        for field in ['url_hop_dong', 'url_de_nghi_xhd', 'url_hoa_don_da_xuat']:
            val = str(r.get(field) or "")
            if "supabase.co" in val and "drive.google.com" not in val:
                needs_migration = True
                break
        if needs_migration:
            targets.append(r['so_don_hang'])
            
    print(f"✅ Tìm thấy {len(targets)} đơn hàng cần di chuyển sang Drive và dọn dẹp.")
    return targets

def trigger_gas_archive(order_number):
    params = {
        "action": "archiveOrderNow",
        "orderNumber": order_number
    }
    try:
        # GAS WebApp require redirect, so allow_redirects=True (default)
        response = requests.get(GAS_URL, params=params, timeout=60)
        print(f" (HTTP {response.status_code})", end="")
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "SUCCESS":
                return True, "Thành công"
            return False, result.get("message", "Lỗi không xác định từ GAS")
        return False, f"Lỗi HTTP {response.status_code}: {response.text[:100]}"
    except Exception as e:
        return False, str(e)

def main():
    orders = get_orders_to_cleanup()
    if not orders:
        print("🎉 Không có đơn hàng nào cần xử lý.")
        return

    success_count = 0
    fail_count = 0
    
    for i, order_no in enumerate(orders):
        print(f"[{i+1}/{len(orders)}] Đang xử lý đơn: {order_no}...", end="", flush=True)
        
        ok, msg = trigger_gas_archive(order_no)
        if ok:
            print(" ✅ OK")
            success_count += 1
        else:
            print(f" ❌ THẤT BẠI ({msg})")
            fail_count += 1
        
        # Tránh spam làm treo GAS
        sleep(0.5)

    print("\n" + "="*40)
    print(f"🏁 HOÀN TẤT QUY TRÌNH DỌN DẸP")
    print(f"✅ Thành công: {success_count}")
    print(f"❌ Thất bại: {fail_count}")
    print("="*40)

if __name__ == "__main__":
    main()
