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

    # Query bookableresource gắn với equipment 7383725d-f683-f111-ab0f-70a8a50348ce (N31913 - VF 5 xe lái thử 01)
    eq_id = "7383725d-f683-f111-ab0f-70a8a50348ce"
    r = requests.get(f"{base_url}/bookableresources?$filter=_msdyn_facilityequipmentid_value eq {eq_id}&$select=bookableresourceid,name", headers=headers)
    print("Status query xe:", r.status_code)
    if r.status_code == 200:
        cars = r.json().get("value", [])
        for c in cars:
            print(f"👉 NGUỒN LỰC CHUẨN CỦA XE VF 5 THUẬN AN:")
            print(f"   Tên: {c.get('name')}")
            print(f"   Resource ID: {c.get('bookableresourceid')}")

    # Query xe VF 2
    eq_id_2 = "f5c9c920-fb83-f111-ab0e-7ced8dfec2a1"
    r2 = requests.get(f"{base_url}/bookableresources?$filter=_msdyn_facilityequipmentid_value eq {eq_id_2}&$select=bookableresourceid,name", headers=headers)
    if r2.status_code == 200:
        for c in r2.json().get("value", []):
            print(f"👉 NGUỒN LỰC CHUẨN CỦA XE VF 2 THUẬN AN:")
            print(f"   Tên: {c.get('name')}")
            print(f"   Resource ID: {c.get('bookableresourceid')}")

if __name__ == "__main__":
    main()
