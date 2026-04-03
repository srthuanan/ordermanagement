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
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
    }

def main():
    print("=" * 60)
    print("🕵️ KIỂM TRA TOÀN BỘ USER TRÊN HỆ THỐNG")
    print("=" * 60)
    
    url = f"{SUPABASE_URL}/rest/v1/profiles?select=id,username,full_name,luot_giu_xe&order=full_name.asc"
    resp = requests.get(url, headers=get_headers())
    
    if resp.status_code != 200:
        print(f"Lỗi: {resp.text}")
        return

    users = resp.json()
    if not isinstance(users, list):
        print(f"Dữ liệu không phải list: {users}")
        return

    print("{:<5} | {:<25} | {:<15} | {:<10}".format("STT", "Họ tên", "Username", "Lượt giữ"))
    print("-" * 65)
    for i, u in enumerate(users, 1):
        name = str(u.get('full_name', '---')).upper()
        user_name = str(u.get('username', '---'))
        keep_count = u.get('luot_giu_xe', 0)
        print("{:<5} | {:<25} | {:<15} | {:<10}".format(i, name[:25], user_name[:15], keep_count))
    
    # Cộng thưởng lại cho Thành Ngọc Vinh (đã sửa lỗi typo)
    print("\n" + "=" * 60)
    print("🎁 ĐANG THỰC HIỆN CỘNG THƯỞNG LẠI CHO BEST SALE...")
    vinh_url = f"{SUPABASE_URL}/rest/v1/profiles?full_name=ilike.*THANH NGOCC VINH*&select=id,full_name,luot_giu_xe"
    # Sửa typo từ NGOCC -> NGOC
    vinh_url = vinh_url.replace("NGOCC", "NGOC")
    
    v_resp = requests.get(vinh_url, headers=get_headers())
    if v_resp.status_code == 200 and v_resp.json():
        v_data = v_resp.json()[0]
        v_id = v_data['id']
        old_count = v_data.get('luot_giu_xe', 0)
        new_count = old_count + 1
        
        up_resp = requests.patch(f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{v_id}", headers=get_headers(), json={"luot_giu_xe": new_count})
        if up_resp.status_code in [200, 204]:
            print(f"✅ ĐÃ CỘNG THÀNH CÔNG: {v_data['full_name']} | {old_count} -> {new_count} lượt.")
        else:
            print(f"❌ Lỗi update Award: {up_resp.text}")
    else:
        print("❌ Không tìm thấy user THÀNH NGỌC VINH!")

if __name__ == "__main__":
    main()
