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

    # Query chi tiết bản ghi Trần Thanh TRúc
    r = requests.get(f"{base_url}/bookableresourcebookings(6423f5dd-c9cd-f111-a05c-6045bd56eed5)", headers=headers)
    if r.status_code == 200:
        b = r.json()
        print("\n=== BẢN GHI THÀNH CÔNG GỐC 'Trần Thanh TRúc' ===")
        for k, v in b.items():
            if not k.startswith("@") and v is not None:
                print(f"   {k}: {v}")

    # Xem xe b3075d43-e220-f111-88b2-002248ec5aac thuộc equipment nào
    # equipmentid: 35337dc3-511c-f111-8342-000d3a80e74d
    r_eq = requests.get(f"{base_url}/equipments(35337dc3-511c-f111-8342-000d3a80e74d)", headers=headers)
    if r_eq.status_code == 200:
        eq = r_eq.json()
        print("\n=== EQUIPMENT CỦA XE B3075D43 ===")
        for k, v in eq.items():
            if not k.startswith("@") and v is not None:
                print(f"   {k}: {v}")

if __name__ == "__main__":
    main()
