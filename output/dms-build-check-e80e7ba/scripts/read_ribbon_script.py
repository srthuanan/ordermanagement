# -*- coding: utf-8 -*-
import json
import os
import base64
import requests

def main():
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        dealers = json.load(f)

    BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.2"
    dealer_n31923 = next((d for d in dealers if d.get("dealer_code") == "N31923"), None)
    headers = {
        "Cookie": dealer_n31923["cookie"],
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }

    # Đọc nội dung itv_VinFast.DMS.Ribbon.Xts_accountreceivablereceipt.js
    r = requests.get(
        f"{BASE_API_URL}/webresourceset?$filter=name eq 'itv_VinFast.DMS.Ribbon.Xts_accountreceivablereceipt.js'&$select=content",
        headers=headers,
        timeout=15
    )
    if r.status_code == 200 and r.json().get("value"):
        content_b64 = r.json()["value"][0].get("content")
        raw = base64.b64decode(content_b64).decode("utf-8", errors="ignore")
        print("=== NỘI DUNG SCRIPT itv_VinFast.DMS.Ribbon.Xts_accountreceivablereceipt.js ===")
        print(raw[:3000])
        if len(raw) > 3000:
            print("\n... (còn tiếp) ...\n")
            print(raw[3000:6000])

if __name__ == "__main__":
    main()
