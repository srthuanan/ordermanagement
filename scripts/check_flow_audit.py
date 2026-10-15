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
        "OData-Version": "4.0"
    }

    rec_id = "a05bd28c-a76a-f111-ab0c-6045bd5969af"

    # 1. Kiểm tra audit history
    print("=== 1. AUDIT LOG CỦA PHIẾU THU ===")
    r_audit = requests.get(f"{BASE_API_URL}/audits?$filter=_regardingobjectid_value eq {rec_id}&$select=action,operation,createdon,_userid_value&$orderby=createdon desc&$top=10", headers=headers, timeout=10)
    if r_audit.status_code == 200:
        for a in r_audit.json().get("value", []):
            print(f"  • Thời gian: {a.get('createdon')} | Action: {a.get('action')} | Operation: {a.get('operation')}")
    else:
        print(f"Audit HTTP {r_audit.status_code}")

    # 2. Kiểm tra các Flow khả dụng
    print("\n=== 2. KIỂM TRA POWER AUTOMATE FLOWS KHẢ DỤNG ===")
    r_flow = requests.get(f"{BASE_API_URL}/workflows?$filter=category eq 5 and primaryentity eq 'xts_accountreceivablereceipt'&$select=name,workflowid", headers=headers, timeout=10)
    if r_flow.status_code == 200:
        for fl in r_flow.json().get("value", []):
            print(f"  • Cloud Flow: {fl.get('name')} (ID: {fl.get('workflowid')})")
    else:
        print(f"Flow HTTP {r_flow.status_code}")

if __name__ == "__main__":
    main()
