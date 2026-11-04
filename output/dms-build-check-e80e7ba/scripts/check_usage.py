import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")

def run_check():
    if not ACCESS_TOKEN:
        print("❌ Thiếu SUPABASE_ACCESS_TOKEN")
        return

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    # 1. Lấy danh sách Organization
    print("\n🏢 Đang lấy danh sách Organization...")
    orgs_res = requests.get("https://api.supabase.com/v1/organizations", headers=headers)
    if orgs_res.status_code != 200:
        print(f"❌ Không thể lấy danh sách Org: {orgs_res.status_code}")
        return
    
    orgs = orgs_res.json()
    
    for org in orgs:
        slug = org['id']
        name = org['name']
        print(f"\n📈 USAGE CHO ORGANIZATION: {name} ({slug})")
        print("="*60)
        
        # Lấy Usage của Org
        usage_url = f"https://api.supabase.com/v1/organizations/{slug}/billing/usage"
        usage_res = requests.get(usage_url, headers=headers)
        
        if usage_res.status_code == 200:
            data = usage_res.json()
            # In ra các thông số quan trọng
            for key, value in data.items():
                if isinstance(value, dict) and 'usage' in value:
                    print(f"🔹 {key:30} : {value['usage']} / {value.get('limit', 'N/A')}")
                else:
                    # Một số field có thể định dạng khác
                    pass
            
            # Nếu muốn xem raw:
            # print(json.dumps(data, indent=2))
        else:
            print(f"❌ Lỗi lấy Usage Org: {usage_res.status_code} - {usage_res.text}")

    # 2. Lấy thông tin Project cụ thể
    PROJECT_REF = "jwvgxqrkjlbewvpkvucj"
    print(f"\n🔍 CHI TIẾT PROJECT: {PROJECT_REF}")
    print("-" * 60)
    
    analytics_url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/analytics/endpoints/usage.api-counts"
    ana_res = requests.get(analytics_url, headers=headers)
    if ana_res.status_code == 200:
        print("✅ API Requests (Gần đây):")
        trends = ana_res.json().get('result', [])[-5:] # Lấy 5 phút gần nhất
        for t in trends:
            print(f"   - {t['timestamp']}: REST={t['total_rest_requests']}, Auth={t['total_auth_requests']}")
    else:
        print(f"❌ Lỗi lấy Analytics: {ana_res.status_code}")

if __name__ == "__main__":
    run_check()
