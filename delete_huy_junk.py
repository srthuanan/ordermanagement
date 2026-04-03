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
        "Content-Type": "application/json"
    }

def main():
    headers = get_headers()
    target_junk = "phamtronghuy"
    print(f"--- DELETING REDUNDANT ACCOUNT: {target_junk} ---")
    
    # 1. Delete from reputation cache
    url_cache = f"{SUPABASE_URL}/rest/v1/user_reputation_cache?username=eq.{target_junk}"
    r1 = requests.delete(url_cache, headers=headers)
    
    # 2. Delete from users table
    url_users = f"{SUPABASE_URL}/rest/v1/users?username=eq.{target_junk}"
    r2 = requests.delete(url_users, headers=headers)
    
    if r1.status_code in [200, 204] and r2.status_code in [200, 204]:
        print(f"✅ ĐÃ XÓA THÀNH CÔNG TÀI KHOẢN THỪA: {target_junk}")
        print("Bây giờ danh sách TVBH của bạn sẽ sạch sẽ và chính xác.")
    else:
        print(f"❌ Có lỗi khi xóa (R1:{r1.status_code}, R2:{r2.status_code}): {r1.text if r1.status_code != 204 else r2.text}")

if __name__ == "__main__":
    main()
