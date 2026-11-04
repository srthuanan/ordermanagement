# -*- coding: utf-8 -*-
import json
import requests

def main():
    with open("dms_dealers_config.json", "r", encoding="utf-8") as f:
        dealers = json.load(f)

    d13 = next((d for d in dealers if d.get("dealer_code") == "N31913"), None)
    cookie = d13.get("cookie")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": 'odata.include-annotations="*"',
        "Cookie": cookie
    }
    base_url = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"

    # Query tất cả xe có tên chứa N31913 hoặc Thuận An
    r = requests.get(f"{base_url}/bookableresources?$filter=contains(name,'N31913') or contains(name,'Thuận An') or contains(name,'Thuan An')&$select=bookableresourceid,name", headers=headers)
    print("Status query xe N31913:", r.status_code)
    if r.status_code == 200:
        cars = r.json().get("value", [])
        print(f"\n🎉 TÌM THẤY {len(cars)} XE CỦA THUẬN AN (N31913):")
        for c in cars:
            print(f" - {c.get('name')} (ID: {c.get('bookableresourceid')})")

    # Nếu không có N31913, query các xe lái thử của BU 360e2f16-ba9d-ef11-8a6b-6045bd5754c8
    r_bu = requests.get(f"{base_url}/bookableresources?$filter=_owningbusinessunit_value eq 360e2f16-ba9d-ef11-8a6b-6045bd5754c8&$select=bookableresourceid,name", headers=headers)
    if r_bu.status_code == 200:
        cars_bu = r_bu.json().get("value", [])
        print(f"\n🎉 TÌM THẤY {len(cars_bu)} XE THUỘC BU THUẬN AN:")
        for c in cars_bu:
            print(f" - {c.get('name')} (ID: {c.get('bookableresourceid')})")

if __name__ == "__main__":
    main()
