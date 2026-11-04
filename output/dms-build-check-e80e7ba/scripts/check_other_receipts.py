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

    # Lấy 5 phiếu thu gần nhất đã có mã SAP FI
    print("=== 1. CÁC PHIẾU THU ĐÃ CÓ MÃ SAP FI ĐỂ SO SÁNH ===")
    url_has_sap = (
        f"{BASE_API_URL}/xts_accountreceivablereceipts?"
        f"$filter=xvf_sapfidocumentno ne null&"
        f"$select=xts_accountreceivablereceiptnumber,createdon,modifiedon,_modifiedby_value,xts_status,xvf_sapfidocumentno,xts_totalreceiptamount&"
        f"$orderby=createdon desc&$top=5"
    )
    r_has = requests.get(url_has_sap, headers=headers, timeout=15)
    if r_has.status_code == 200:
        for rec in r_has.json().get("value", []):
            print(f"  • Phiếu: {rec.get('xts_accountreceivablereceiptnumber')}")
            print(f"    SAP FI No: {rec.get('xvf_sapfidocumentno')}")
            print(f"    Tạo lúc: {rec.get('createdon')} | Cập nhật lúc: {rec.get('modifiedon')}")
    else:
        print(f"HTTP {r_has.status_code}")

    # Lấy 5 phiếu thu tạo hôm nay (15/10/2026) xem trạng thái
    print("\n=== 2. CÁC PHIẾU THU TẠO HÔM NAY (15/10/2026) ===")
    url_today = (
        f"{BASE_API_URL}/xts_accountreceivablereceipts?"
        f"$filter=createdon ge 2026-10-14T17:00:00Z&"
        f"$select=xts_accountreceivablereceiptnumber,createdon,xts_status,xvf_sapfidocumentno,xts_totalreceiptamount&"
        f"$orderby=createdon desc&$top=5"
    )
    r_today = requests.get(url_today, headers=headers, timeout=15)
    if r_today.status_code == 200:
        for rec in r_today.json().get("value", []):
            print(f"  • Phiếu: {rec.get('xts_accountreceivablereceiptnumber')} | Tiền: {rec.get('xts_totalreceiptamount')}")
            print(f"    SAP FI No: {rec.get('xvf_sapfidocumentno')} | Tạo lúc: {rec.get('createdon')}")
    else:
        print(f"HTTP {r_today.status_code}")

if __name__ == "__main__":
    main()
