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

    # Query equipment của Thuận An (tìm theo tên hoặc business unit)
    r = requests.get(f"{base_url}/equipments?$filter=contains(name,'Thuận An') or contains(name,'Thuan An') or contains(name,'B012')&$select=name,equipmentid,xts_type,_businessunitid_value,xts_vehiclemodelname", headers=headers)
    print("Status query equipment Thuận An:", r.status_code)
    if r.status_code == 200:
        eqs = r.json().get("value", [])
        print(f"\nTìm thấy {len(eqs)} equipment của Thuận An:")
        for e in eqs:
            print(f" - {e.get('name')} | xts_type: {e.get('xts_type')} | BU: {e.get('_businessunitid_value')} | Model: {e.get('xts_vehiclemodelname')}")

    # Query Business Unit 360e2f16-ba9d-ef11-8a6b-6045bd5754c8 để xem tên và parent
    r_bu = requests.get(f"{base_url}/businessunits(360e2f16-ba9d-ef11-8a6b-6045bd5754c8)?$select=name,_parentbusinessunitid_value", headers=headers)
    if r_bu.status_code == 200:
        bu = r_bu.json()
        print(f"\nThông tin BU Thuận An: Name='{bu.get('name')}', Parent='{bu.get('_parentbusinessunitid_value')}'")

if __name__ == "__main__":
    main()
