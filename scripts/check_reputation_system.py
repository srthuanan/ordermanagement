import urllib.request
import json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def fetch_data(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {endpoint}:", e)
        return None

def main():
    print("🔍 Đang kiểm tra hệ thống Chấm điểm Uy tín (Reputation System)...\n")
    
    # 1. Check user_reputation_cache table
    cache = fetch_data("user_reputation_cache?select=*&limit=10")
    if cache is not None:
        print(f"✅ Bảng 'user_reputation_cache' hoạt động bình thường! (Tổng số bản ghi cache: {len(cache)})")
        print("Mẫu dữ liệu cache:")
        for row in cache[:5]:
            print(f"  - Username: {row.get('username')} | Score: {row.get('score')} | Holds Total: {row.get('total_holds')} | Matched: {row.get('matched_holds')} | Champion: {row.get('is_champion')}")
    else:
        print("❌ Không thể kết nối hoặc đọc từ bảng 'user_reputation_cache'")

    # 2. Check car_hold_activities table
    activities = fetch_data("car_hold_activities?select=*&limit=5")
    if activities is not None:
        print(f"\n✅ Bảng 'car_hold_activities' hoạt động bình thường! (Mẫu hoạt động giữ xe: {len(activities)})")
    else:
        print("\n❌ Không thể lấy dữ liệu từ 'car_hold_activities'")

    # 3. Check reputation_adjustments table
    adj = fetch_data("reputation_adjustments?select=*&limit=5")
    if adj is not None:
        print(f"\n✅ Bảng 'reputation_adjustments' (Điều chỉnh Admin) hoạt động bình thường!")
    else:
        print("\n❌ Không thể đọc bảng 'reputation_adjustments'")

    # 4. Check users reputation list
    users = fetch_data("users?select=username,full_name,is_blocked")
    if users:
        print(f"\n✅ Danh sách người dùng hệ thống ({len(users)} người dùng):")
        for u in users[:5]:
            print(f"  - User: {u.get('full_name')} ({u.get('username')}) | Blocked: {u.get('is_blocked')}")

if __name__ == "__main__":
    main()
