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
    
    print("--- DỌN DẸP ĐƠN HÀNG ĐÃ HỦY (Cột: ket_qua) ---")
    # Sử dụng cột chuẩn xác là 'ket_qua'
    url = f"{SUPABASE_URL}/rest/v1/donhang?ket_qua=eq.Đã hủy"
    r = requests.delete(url, headers=headers)
    
    if r.status_code in [200, 204]:
        print(f"✅ ĐÃ DỌN DẸP THÀNH CÔNG các đơn hàng bị hủy!")
    else:
        print(f"❌ Lỗi khi xóa: {r.status_code} - {r.text}")

if __name__ == "__main__":
    main()
