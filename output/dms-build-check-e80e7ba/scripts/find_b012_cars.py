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

    # Query tất cả xe có tiền tố B012 (Mã kho xe lái thử của Thuận An)
    r = requests.get(f"{base_url}/bookableresources?$filter=contains(name,'B012')&$select=bookableresourceid,name", headers=headers)
    print("Status query xe B012:", r.status_code)
    if r.status_code == 200:
        cars = r.json().get("value", [])
        print(f"\n🎉 TÌM THẤY {len(cars)} XE LÁI THỬ CHUẨN CỦA SHOWROOM THUẬN AN (B012):")
        for c in cars:
            print(f" - {c.get('name')} (ID: {c.get('bookableresourceid')})")

if __name__ == "__main__":
    main()
