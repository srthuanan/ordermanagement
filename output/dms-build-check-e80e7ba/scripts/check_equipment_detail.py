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

    # 1. Query trực tiếp equipment 3620c987-e900-ee11-8f6d-000d3a85c2a2
    r_eq = requests.get(f"{base_url}/equipments(3620c987-e900-ee11-8f6d-000d3a85c2a2)", headers=headers)
    print("Status query equipment:", r_eq.status_code)
    if r_eq.status_code == 200:
        eq = r_eq.json()
        print("\n=== THÔNG TIN EQUIPMENT XE VF 5 ===")
        for k, v in eq.items():
            if not k.startswith("@") and v is not None:
                print(f"   {k}: {v}")

    # 2. Query 5 equipment bất kỳ có xts_type=3 xem businessunitid của nó là gì
    r_types = requests.get(f"{base_url}/equipments?$filter=xts_type eq 3&$top=5&$select=name,xts_type,_businessunitid_value", headers=headers)
    if r_types.status_code == 200:
        print("\n=== CÁC EQUIPMENT CÓ xts_type = 3 ===")
        for e in r_types.json().get("value", []):
            print(f" - {e.get('name')}: BU={e.get('_businessunitid_value')}")

if __name__ == "__main__":
    main()
