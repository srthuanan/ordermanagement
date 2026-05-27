import requests
import json
import getpass
import urllib3

# Tắt cảnh báo SSL nếu có
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL = "https://txcivsdgjkmlrjxramos.supabase.co"
ANON_KEY = "sb_publishable_Tfm5RChLrn3OrFTyD5O81Q_HMf36QBc"

def login(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }
    
    print("\nĐang đăng nhập...")
    response = requests.post(url, headers=headers, json=payload, verify=False)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Đăng nhập thành công!")
        return data['access_token']
    else:
        print("❌ Đăng nhập thất bại:", response.text)
        return None

def insert_notification(jwt_token):
    url = f"{SUPABASE_URL}/rest/v1/admin_notifications"
    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload = {
        "type": "test_notification",
        "message": "🚨 Test từ Python: Hệ thống thông báo đã hoạt động thành công!",
        "link": "python-test"
    }
    
    print("\nĐang tạo thông báo...")
    response = requests.post(url, headers=headers, json=payload, verify=False)
    
    if response.status_code == 201:
        print("✅ Tạo thông báo thành công! Hãy kiểm tra quả chuông trên web admin.")
    else:
        print(f"❌ Tạo thông báo thất bại (Lỗi {response.status_code}):", response.text)

if __name__ == "__main__":
    print("=== TEST HỆ THỐNG THÔNG BÁO SUPABASE ===")
    email = input("Nhập Email của bạn (Tài khoản TVBH hoặc Admin): ")
    password = getpass.getpass("Nhập Mật khẩu: ")
    
    token = login(email, password)
    if token:
        insert_notification(token)
