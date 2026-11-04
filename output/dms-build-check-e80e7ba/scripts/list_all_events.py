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

    url = f"{base_url}/itv_testdriveevents?$filter=statecode eq 0&$orderby=createdon desc&$top=10"
    r = requests.get(url, headers=headers)
    print("Status:", r.status_code)
    for ev in r.json().get("value", []):
        print(f"Code: {ev.get('itv_code')} | Name: {ev.get('itv_name')} | ID: {ev.get('itv_testdriveeventid')} | BU: {ev.get('_owningbusinessunit_value')}")

if __name__ == "__main__":
    main()
