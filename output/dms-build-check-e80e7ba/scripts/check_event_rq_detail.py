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

    # Query sự kiện cbdf98e1-53ca-ed11-b596-002248ebf467
    r = requests.get(f"{base_url}/xts_commons(cbdf98e1-53ca-ed11-b596-002248ebf467)", headers=headers)
    print("Status query event:", r.status_code)
    if r.status_code == 200:
        ev = r.json()
        print("\n=== CHI TIẾT SỰ KIỆN GỐC ===")
        for k, v in ev.items():
            if not k.startswith("@") and v is not None:
                print(f"   {k}: {v}")

    # Query msdyn_resourcerequirements(97d66c26-1ead-ed11-83ff-000d3a85cb76)
    r_rq = requests.get(f"{base_url}/msdyn_resourcerequirements(97d66c26-1ead-ed11-83ff-000d3a85cb76)", headers=headers)
    if r_rq.status_code == 200:
        rq = r_rq.json()
        print("\n=== CHI TIẾT RESOURCE REQUIREMENT ===")
        for k, v in rq.items():
            if not k.startswith("@") and v is not None:
                print(f"   {k}: {v}")

if __name__ == "__main__":
    main()
