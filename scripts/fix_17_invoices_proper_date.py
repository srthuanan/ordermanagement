import requests
import json
import re

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

# Danh sách 17 xe cần chuẩn hóa ngày xuất hóa đơn theo đúng hóa đơn GTGT M-Invoice
UPDATES = [
    # Đợt 15/10/2026 (7 xe)
    {"order_no": "N31913-VSO-26-10-0065", "correct_date": "2026-10-15T17:37:55+07:00", "so_hd": "47188"},
    {"order_no": "N31923-VSO-26-10-0127", "correct_date": "2026-10-15T17:37:55+07:00", "so_hd": "47189"},
    {"order_no": "N31913-VSO-26-10-0018", "correct_date": "2026-10-15T17:37:55+07:00", "so_hd": "47185"},
    {"order_no": "N31913-VSO-26-10-0061", "correct_date": "2026-10-15T17:37:55+07:00", "so_hd": "47187"},
    {"order_no": "N31923-VSO-26-10-0140", "correct_date": "2026-10-15T17:37:55+07:00", "so_hd": "47183"},
    {"order_no": "N31923-VSO-26-10-0138", "correct_date": "2026-10-15T17:37:55+07:00", "so_hd": "47184"},
    {"order_no": "N31923-VSO-26-10-0125", "correct_date": "2026-10-15T17:37:10+07:00", "so_hd": "47186"},

    # Đợt 17/10/2026 (5 xe)
    {"order_no": "N31913-VSO-26-10-0077", "correct_date": "2026-10-17T17:07:09+07:00", "so_hd": "47529"},
    {"order_no": "N31913-VSO-26-08-0143", "correct_date": "2026-10-17T17:06:47+07:00", "so_hd": "47532"},
    {"order_no": "N31913-VSO-26-10-0067", "correct_date": "2026-10-17T17:06:47+07:00", "so_hd": "47531"},
    {"order_no": "N31913-VSO-26-10-0032", "correct_date": "2026-10-17T17:06:47+07:00", "so_hd": "47530"},
    {"order_no": "N31920-VSO-26-09-0135", "correct_date": "2026-10-17T17:06:46+07:00", "so_hd": "47481"},

    # Đợt 19/10/2026 (3 xe)
    {"order_no": "N31923-VSO-26-10-0161", "correct_date": "2026-10-19T16:08:41+07:00", "so_hd": "47713"},
    {"order_no": "N31913-VSO-26-10-0081", "correct_date": "2026-10-19T16:08:41+07:00", "so_hd": "47712"},
    {"order_no": "N31913-VSO-26-08-0154", "correct_date": "2026-10-19T16:08:41+07:00", "so_hd": "47711"},

    # Đợt 20/10/2026 (2 xe)
    {"order_no": "N31923-VSO-26-06-0301", "correct_date": "2026-10-20T16:29:17+07:00", "so_hd": "47961"},
    {"order_no": "N31911-VSO-26-10-0050", "correct_date": "2026-10-20T16:29:17+07:00", "so_hd": "47960"},
]

def main():
    print("=== 1. CẬP NHẬT CHUẨN XÁC TRÊN SUPABASE (yeucauxhd & donhang) ===")
    success_count = 0
    for item in UPDATES:
        order_no = item["order_no"]
        correct_date = item["correct_date"]
        so_hd = item["so_hd"]

        # 1. Update yeucauxhd (thử cả order_no và order_no kèm khoảng trắng nếu có)
        r_yc = requests.patch(
            f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=ilike.*{order_no.strip()}*",
            headers=HEADERS,
            json={"ngay_xuat_hoa_don": correct_date}
        )
        
        # 2. Update donhang
        r_dh = requests.patch(
            f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=ilike.*{order_no.strip()}*",
            headers=HEADERS,
            json={"ngay_xuat_hoa_don": correct_date}
        )

        yc_ok = r_yc.status_code in (200, 204)
        dh_ok = r_dh.status_code in (200, 204)
        print(f"[{order_no}] HĐ: {so_hd} ➔ Ngày mới: {correct_date[:10]} | Yêu cầu: HTTP {r_yc.status_code} | Đơn hàng: HTTP {r_dh.status_code}")
        if yc_ok: success_count += 1

    print(f"\n✅ Đã cập nhật thành công {success_count}/{len(UPDATES)} đơn hàng trên Supabase.")

    # 3. Kích hoạt đồng bộ sang Google Sheet
    print("\n=== 2. KÍCH HOẠT ĐỒNG BỘ DỮ LIỆU SANG GOOGLE SHEET ===")
    try:
        r_gas = requests.post(GAS_WEBHOOK, json={"action": "syncTable", "targetTable": "yeucauxhd"}, timeout=30)
        print(f"GAS sync response: HTTP {r_gas.status_code} -> {r_gas.text[:300]}")
    except Exception as e:
        print(f"GAS sync error: {e}")

if __name__ == "__main__":
    main()
