# -*- coding: utf-8 -*-
import json
import os
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
        "OData-Version": "4.0",
        "Prefer": 'odata.include-annotations="*"'
    }

    # 1. Chi tiết phiếu N31923-TK-26-10-0039 (đã có mã SAP)
    r_39 = requests.get(f"{BASE_API_URL}/xts_accountreceivablereceipts?$filter=xts_accountreceivablereceiptnumber eq 'N31923-TK-26-10-0039'", headers=headers, timeout=10)
    # 2. Chi tiết phiếu N31923-TK-26-06-0253 (phiếu của user)
    r_user = requests.get(f"{BASE_API_URL}/xts_accountreceivablereceipts(a05bd28c-a76a-f111-ab0c-6045bd5969af)", headers=headers, timeout=10)

    print("=== SO SÁNH 2 PHIẾU THU ===")
    if r_39.status_code == 200 and r_39.json().get("value"):
        v39 = r_39.json()["value"][0]
        vu = r_user.json()
        fields_to_compare = [
            "xts_status", "xts_type", "xts_category", "xts_handling",
            "xvf_sapfidocumentno", "createdon", "modifiedon",
            "_modifiedby_value@OData.Community.Display.V1.FormattedValue",
            "_xts_cashandbankid_value@OData.Community.Display.V1.FormattedValue",
            "_xts_methodofpaymentid_value@OData.Community.Display.V1.FormattedValue",
            "itv_externalorderid", "itv_transferpreordertosaplog"
        ]
        print(f"{'Trường':<35} | {'Phiếu thành công (0039)':<30} | {'Phiếu của bạn (0253)':<30}")
        print("-" * 100)
        for f in fields_to_compare:
            val39 = str(v39.get(f))
            valu = str(vu.get(f))
            print(f"{f:<35} | {val39:<30} | {valu:<30}")

if __name__ == "__main__":
    main()
