import os
import requests
import datetime
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
    
    # 1. Tính ngày cutoff (7 ngày trước)
    cutoff = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
    
    print(f"--- DỌN DẸP INTERACTIONS CŨ HƠN 7 NGÀY (Cấp tốc) ---")
    print(f"Mốc thời gian xóa: Trước ngày {cutoff}")
    
    url = f"{SUPABASE_URL}/rest/v1/interactions?created_at=lt.{cutoff}"
    r = requests.delete(url, headers=headers)
    
    if r.status_code in [200, 204]:
        print(f"✅ ĐÃ DỌN DẸP THÀNH CÔNG! Bảng Interactions đã được làm sạch.")
    else:
        print(f"❌ Có lỗi khi dọn dẹp: {r.status_code} - {r.text}")

if __name__ == "__main__":
    main()
