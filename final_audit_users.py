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
    print("=" * 70)
    print("🔍 TỔNG RÀ SOÁT DANH SÁCH NHÂN SỰ (BẢNG USERS)")
    print("=" * 70)
    
    # Lấy dữ liệu từ bảng users
    url_users = f"{SUPABASE_URL}/rest/v1/users?select=username,full_name&order=full_name.asc"
    r = requests.get(url_users, headers=headers)
    users = r.json()

    # Lấy dữ liệu từ bảng cache reputation
    url_cache = f"{SUPABASE_URL}/rest/v1/user_reputation_cache?select=username"
    r_cache = requests.get(url_cache, headers=headers)
    cache_usernames = [c['username'] for c in r_cache.json()]

    print("{:<5} | {:<25} | {:<15} | {:<10}".format("STT", "Họ tên", "Username", "Hiển thị?"))
    print("-" * 70)
    
    count = 0
    for i, u in enumerate(users, 1):
        uname = u.get('username', '---')
        fname = u.get('full_name', '---').upper()
        # Một user được coi là "đang hiển thị" nếu có trong cache reputation
        is_visible = "X" if uname in cache_usernames else " "
        if is_visible == "X":
            count += 1
        print("{:<5} | {:<25} | {:<15} | {:<10}".format(i, fname[:25], uname[:15], is_visible))

    print("-" * 70)
    print(f"Tổng số User khả dụng (có Badge): {count}")
    print("=" * 70)
    print("\n💡 Tôi sẽ tìm các trường hợp cùng Tên nhưng khác Username để xóa giúp bạn.")

if __name__ == "__main__":
    main()
