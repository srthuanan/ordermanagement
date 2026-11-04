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

    # Query equipment theo _businessunitid_value = 360e2f16-ba9d-ef11-8a6b-6045bd5754c8
    r = requests.get(f"{base_url}/equipments?$filter=_businessunitid_value eq 360e2f16-ba9d-ef11-8a6b-6045bd5754c8&$select=name,equipmentid,xts_type,xts_vehiclemodelname", headers=headers)
    print("Status query equipment của BU 360e2f16:", r.status_code)
    if r.status_code == 200:
        eqs = r.json().get("value", [])
        print(f"Tìm thấy {len(eqs)} equipment trong BU 360e2f16:")
        for e in eqs:
            print(f" - {e.get('name')} | xts_type: {e.get('xts_type')} | Model: {e.get('xts_vehiclemodelname')} | ID: {e.get('equipmentid')}")

    # Query equipment của xe b3075d43-e220-f111-88b2-002248ec5aac (B012 - MPV 7 xe lái thử 05)
    # Equipment ID của nó là: 35337dc3-511c-f111-8342-000d3a80e74d
    r_eq = requests.get(f"{base_url}/equipments(35337dc3-511c-f111-8342-000d3a80e74d)?$select=name,xts_type,_businessunitid_value,xts_vehiclemodelname", headers=headers)
    if r_eq.status_code == 200:
        eq = r_eq.json()
        print(f"\nEquipment của xe thành công (B012 - MPV 7):")
        print(f" - Tên: {eq.get('name')}")
        print(f" - xts_type: {eq.get('xts_type')}")
        print(f" - BU ID: {eq.get('_businessunitid_value')}")
        print(f" - Model: {eq.get('xts_vehiclemodelname')}")

if __name__ == "__main__":
    main()
