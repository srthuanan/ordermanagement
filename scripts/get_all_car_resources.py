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

    print("--- TẤT CẢ BOOKABLE RESOURCES LIÊN QUAN ĐẾN XE Ô TÔ ---")
    url = f"{base_url}/bookableresources?$filter=contains(name,'B012') or contains(name,'B016') or contains(name,'N31913') or contains(name,'Testdrive') or contains(name,'Limo Green')&$select=bookableresourceid,name"
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        for item in r.json().get("value", []):
            print(f"Name: {item.get('name')} | ID: {item.get('bookableresourceid')}")

if __name__ == "__main__":
    main()
