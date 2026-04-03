import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def main():
    headers = get_headers()
    url_base = f"{SUPABASE_URL}/rest/v1"
    
    # 1. Lấy danh sách các đơn hàng đã hủy
    print("📋 Đang tìm danh sách đơn hàng đã hủy...")
    # Thử cả hai kiểu trạng thái phổ biến
    r = requests.get(f"{url_base}/donhang?or=(trang_thai.eq.Đã hủy,trang_thai.eq.Hủy)&select=so_don_hang", headers=headers)
    if r.status_code != 200:
        print(f"❌ Lỗi khi tải danh sách: {r.text}")
        return
        
    cancelled_orders = [o['so_don_hang'] for o in r.json()]
    if not cancelled_orders:
        print("✅ Không có đơn hàng nào bị hủy cần dọn dẹp.")
    else:
        print(f"♻️ Tìm thấy {len(cancelled_orders)} đơn hàng đã hủy. Bắt đầu xóa triệt để...")
        for order_no in cancelled_orders:
            print(f"Xóa đơn: {order_no}")
            # Xóa các liên kết ở bảng yeucauxhd trước
            requests.delete(f"{url_base}/yeucauxhd?so_don_hang=eq.{order_no}", headers=headers)
            # Sau đó xóa ở bảng donhang
            requests.delete(f"{url_base}/donhang?so_don_hang=eq.{order_no}", headers=headers)
        print("✅ HOÀN TẤT DỌN DẸP LỊCH SỬ ĐƠN HỦY!")

if __name__ == "__main__":
    main()
