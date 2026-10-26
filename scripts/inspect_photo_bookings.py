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

    # Lấy các bản ghi trong hình: BK-2026-10-17-719948, BK-2026-10-17-719816, BK-2026-10-17-719687
    sample_names = ["BK-2026-10-17-719948", "BK-2026-10-17-719816", "BK-2026-10-17-719687", "BK-2026-10-17-719676"]
    
    for s_name in sample_names:
        print(f"\n==================== {s_name} ====================")
        url = f"{base_url}/bookableresourcebookings?$filter=name eq '{s_name}'"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            vals = r.json().get("value", [])
            if vals:
                b = vals[0]
                print(f"Name: {b.get('name')}")
                print(f"Customer: {b.get('itv_name')} | Phone: {b.get('itv_phone')}")
                print(f"Resource text: {b.get('_resource_value@OData.Community.Display.V1.FormattedValue')} (ID: {b.get('_resource_value')})")
                print(f"Vehicle Model text: {b.get('itv_vehiclemodeltext')}")
                print(f"Vehicle Model GUID: {b.get('_itv_vehiclemodel_value')} (Formatted: {b.get('_itv_vehiclemodel_value@OData.Community.Display.V1.FormattedValue')})")
                print(f"Event: {b.get('_itv_testdriveeventid_value@OData.Community.Display.V1.FormattedValue')} (ID: {b.get('_itv_testdriveeventid_value')})")
                print(f"BusinessUnit: {b.get('_itv_businessunit_value@OData.Community.Display.V1.FormattedValue')} (ID: {b.get('_itv_businessunit_value')})")
                print(f"Owning BU: {b.get('_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue')} (ID: {b.get('_owningbusinessunit_value')})")
            else:
                print("Không tìm thấy!")
        else:
            print("Lỗi status:", r.status_code)

if __name__ == "__main__":
    main()
