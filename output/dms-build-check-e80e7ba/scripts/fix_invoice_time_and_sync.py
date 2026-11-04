import requests
import json
import os

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ."
    "R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
)
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

GAS_WEBHOOK = "https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec"

ORDERS_TO_FIX = [
    "N31913-VSO-26-08-0143",
    "N31913-VSO-26-10-0067",
    "N31913-VSO-26-10-0032"
]
EXACT_TIMESTAMP = "2026-10-17T11:42:21+07:00"

def main():
    print("=== 1. CẬP NHẬT GIỜ PHÚT GIÂY THỰC TẾ TRÊN SUPABASE ===")
    for order_no in ORDERS_TO_FIX:
        # Update donhang
        r_dh = requests.patch(
            f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.{order_no}",
            headers=HEADERS,
            json={"ngay_xuat_hoa_don": EXACT_TIMESTAMP}
        )
        print(f"[{order_no}] donhang update: HTTP {r_dh.status_code}")
        
        # Update yeucauxhd
        r_yc = requests.patch(
            f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{order_no}",
            headers=HEADERS,
            json={"ngay_xuat_hoa_don": EXACT_TIMESTAMP}
        )
        print(f"[{order_no}] yeucauxhd update: HTTP {r_yc.status_code}")

    print("\n=== 2. KIỂM TRA LẠI DỮ LIỆU ĐÃ CẬP NHẬT TRÊN SUPABASE ===")
    for order_no in ORDERS_TO_FIX:
        r_chk = requests.get(
            f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{order_no}&select=so_don_hang,ten_khach_hang,ngay_xuat_hoa_don",
            headers=HEADERS
        )
        if r_chk.status_code == 200 and r_chk.json():
            row = r_chk.json()[0]
            print(f"-> {row.get('so_don_hang')}: {row.get('ten_khach_hang')} | ngay_xuat_hoa_don = {row.get('ngay_xuat_hoa_don')}")
        else:
            print(f"-> {order_no}: Không tìm thấy hoặc lỗi: {r_chk.text}")

    print("\n=== 3. KÍCH HOẠT ĐỒNG BỘ SANG GOOGLE SHEET (yeucauxhd) ===")
    try:
        r_gas = requests.post(GAS_WEBHOOK, json={"action": "syncTable", "targetTable": "yeucauxhd"}, timeout=30)
        print(f"GAS sync response: HTTP {r_gas.status_code} -> {r_gas.text[:300]}")
    except Exception as e:
        print(f"GAS sync error: {e}")

if __name__ == "__main__":
    main()
