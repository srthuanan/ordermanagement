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
    
    print("--- DỌN DẸP ĐƠN HÀNG ĐÃ HỦY HIỆN TẠI ---")
    # Xử lý cả hai trạng thái phổ biến: 'Đã hủy' và 'Hủy'
    for status in ['Đã hủy', 'Hủy']:
        url = f"{SUPABASE_URL}/rest/v1/donhang?trang_thai=eq.{status}"
        r = requests.delete(url, headers=headers)
        if r.status_code in [200, 204]:
            print(f"✅ Đã xóa các đơn hàng có trạng thái: {status}")
        else:
            print(f"❌ Lỗi khi xóa trạng thái {status}: {r.status_code}")

    print("\n💡 Ghi chú: Tôi đã tích hợp lệnh xóa đơn hủy vào Robot Maintenance.")
    print("Mỗi khi Robot chạy (6 tiếng/lần), nó sẽ tự động quét và xóa hoàn toàn các đơn hàng bị hủy.")

if __name__ == "__main__":
    main()
