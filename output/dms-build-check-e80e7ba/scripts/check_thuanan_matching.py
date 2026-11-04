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

    # Query xe gắn với 2 equipment 7383725d-f683-f111-ab0f-70a8a50348ce và f5c9c920-fb83-f111-ab0e-7ced8dfec2a1
    for eq_id in ["7383725d-f683-f111-ab0f-70a8a50348ce", "f5c9c920-fb83-f111-ab0e-7ced8dfec2a1"]:
        r = requests.get(f"{base_url}/equipments({eq_id})", headers=headers)
        if r.status_code == 200:
            eq = r.json()
            print(f"\nEquipment: {eq.get('name')}")
            print(f" - xts_type: {eq.get('xts_type')}")
            print(f" - BU: {eq.get('_businessunitid_value')}")
            print(f" - Model name: {eq.get('xts_vehiclemodelname')}")
            print(f" - Model ID: {eq.get('_xts_vehiclemodelid_value')}")

    # Chạy FetchXML kiểm tra chính xác câu lệnh của Plugin:
    fetch_test = """<fetch no-lock='true'>
      <entity name='bookableresource'>
        <attribute name='bookableresourceid' />
        <attribute name='name' />
        <link-entity name='equipment' from='equipmentid' to='msdyn_facilityequipmentid'>
          <attribute name='name' />
          <attribute name='xts_type' />
          <attribute name='businessunitid' />
          <filter>
             <condition attribute='businessunitid' operator='eq' value='360e2f16-ba9d-ef11-8a6b-6045bd5754c8' />
          </filter>
        </link-entity>
      </entity>
    </fetch>"""
    r_test = requests.get(f"{base_url}/bookableresources?fetchXml={requests.utils.quote(fetch_test)}", headers=headers)
    print("\nKết quả link equipment trong BU Thuận An:", r_test.status_code)
    if r_test.status_code == 200:
        found = r_test.json().get("value", [])
        print(f"Số lượng bookableresource có equipment trong BU Thuận An: {len(found)}")
        for x in found:
            print(" -", x)

if __name__ == "__main__":
    main()
