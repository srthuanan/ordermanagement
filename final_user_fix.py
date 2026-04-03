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
    
    # 1. FETCH ALL REPUTATION CACHE
    url_cache = f"{SUPABASE_URL}/rest/v1/user_reputation_cache"
    r = requests.get(url_cache, headers=headers)
    cache = r.json()
    
    # 2. IDENTIFY JUNK (Vietnamese characters in username)
    viet_chars = 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ'
    junk = [c['username'] for c in cache if any(char in c['username'] for char in viet_chars)]
    
    print(f"--- CLEANING JUNK USERS ({len(junk)}) ---")
    for username in junk:
        print(f"Deleting '{username}'...")
        # Delete from cache
        requests.delete(f"{url_cache}?username=eq.{username}", headers=headers)
        # Delete from users table
        requests.delete(f"{SUPABASE_URL}/rest/v1/users?username=eq.{username}", headers=headers)

    # 3. AWARD BEST SALE (vinhtn)
    print("\n--- AWARDING BEST SALE (vinhtn) ---")
    award_r = requests.patch(f"{url_cache}?username=eq.vinhtn", headers=headers, json={"is_champion": True})
    if award_r.status_code in [200, 204]:
        print("✅ Thành công: THÀNH NGỌC VINH (vinhtn) đã được cộng thêm 1 lượt giữ xe!")
    else:
        print(f"❌ Thất bại khi cộng thưởng: {award_r.text}")

    print("\n✨ ĐÃ HOÀN TẤT DỌN DẸP! Bạn hãy F5 (Làm mới) lại trang web nhé.")

if __name__ == "__main__":
    main()
