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

    # 1. Query chính xác FetchXML mà Plugin VinFast đang dùng để xem Thuận An có những xe nào thoả mãn!
    fetch_xml = """<fetch no-lock='true'>
      <entity name='bookableresource'>
        <attribute name='statecode' />
        <attribute name='bookableresourceid' />
        <attribute name='name' />
        <filter>
          <condition attribute='statecode' operator='eq' value='0'/>
          <condition entityname='equipment' attribute='xts_type' operator='eq' value='3' />
          <condition entityname='equipment' attribute='businessunitid' operator='eq' value='360e2f16-ba9d-ef11-8a6b-6045bd5754c8' />
        </filter>
        <link-entity name='equipment' from='equipmentid' to='msdyn_facilityequipmentid'>
          <attribute name='name' />
          <attribute name='xts_type' />
          <attribute name='xts_vehiclemodelname' />
          <attribute name='xts_vehiclemodelid' />
          <link-entity name='xts_vehiclemodel' from='xts_vehiclemodelid' to='xts_vehiclemodelid'>
             <attribute name='xts_vehiclemodel' />
          </link-entity>
        </link-entity>
      </entity>
    </fetch>"""

    url = f"{base_url}/bookableresources?fetchXml={requests.utils.quote(fetch_xml)}"
    r = requests.get(url, headers=headers)
    print("Status code query xe hợp lệ:", r.status_code)
    if r.status_code == 200:
        cars = r.json().get("value", [])
        print(f"\n🎉 TÌM THẤY {len(cars)} XE LÁI THỬ HỢP LỆ (xts_type=3) TẠI THUẬN AN:")
        for c in cars:
            print(f" - Tên: {c.get('name')}")
            print(f"   Resource ID: {c.get('bookableresourceid')}")
            print(f"   Model Name: {c.get('equipment1_x002e_xts_vehiclemodelname')}")
            print(f"   Model Code: {c.get('xts_vehiclemodel2_x002e_xts_vehiclemodel')}")
            print(f"   Model ID: {c.get('equipment1_x002e_xts_vehiclemodelid')}")
            print("   -------------------------------------------------")
    else:
        print("Lỗi query:", r.text[:300])

    # 2. Kiểm tra riêng chiếc xe '10A1 - VF 5 xe nguồn lực 02' (c7e8aacd-f300-ee11-8f6d-000d3a85c5df)
    eq_url = f"{base_url}/equipments(3620c987-e900-ee11-8f6d-000d3a85c2a2)?$select=name,xts_type,businessunitid,xts_vehiclemodelname"
    r_eq = requests.get(eq_url, headers=headers)
    if r_eq.status_code == 200:
        eq = r_eq.json()
        print("\nThông tin Equipment của chiếc '10A1 - VF 5 xe nguồn lực 02':")
        print(f" - Tên: {eq.get('name')}")
        print(f" - xts_type: {eq.get('xts_type')}")
        print(f" - businessunitid: {eq.get('_businessunitid_value')}")
        print(f" - xts_vehiclemodelname: {eq.get('xts_vehiclemodelname')}")

if __name__ == "__main__":
    main()
