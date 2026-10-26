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

    r = requests.get(f"{base_url}/bookableresources?$filter=contains(name,'N31913')&$select=bookableresourceid,name,_msdyn_facilityequipmentid_value", headers=headers)
    print("Search 'N31913' in bookableresources:", r.status_code)
    if r.status_code == 200:
        print("Results:", r.json().get("value", []))

    # Nếu không có N31913, search 'VF 5 xe lái thử' hoặc 'VF 2 xe lái thử'
    r2 = requests.get(f"{base_url}/bookableresources?$filter=contains(name,'xe lái thử')&$top=20&$select=bookableresourceid,name,_msdyn_facilityequipmentid_value,_owningbusinessunit_value", headers=headers)
    if r2.status_code == 200:
        print("\nDanh sách xe có tên 'xe lái thử':")
        for c in r2.json().get("value", []):
            print(f" - {c.get('name')} (ID: {c.get('bookableresourceid')}) | BU: {c.get('_owningbusinessunit_value')}")

if __name__ == "__main__":
    main()
