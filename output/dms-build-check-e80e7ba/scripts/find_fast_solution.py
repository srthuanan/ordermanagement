# -*- coding: utf-8 -*-
import json
import os
import requests

def main():
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        dealers = json.load(f)

    BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.2"
    rec_id = "a05bd28c-a76a-f111-ab0c-6045bd5969af"

    # 1. Thử dùng tài khoản N31911 (có role VF Accounts) để đọc/thao tác trên phiếu thu này
    d_11 = next((d for d in dealers if d.get("dealer_code") == "N31911"), None)
    if d_11 and d_11.get("cookie"):
        h_11 = {
            "Cookie": d_11["cookie"],
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }
        r_test = requests.get(f"{BASE_API_URL}/xts_accountreceivablereceipts({rec_id})?$select=xts_accountreceivablereceiptnumber", headers=h_11, timeout=10)
        print(f"Kiểm tra User N31911 (có role VF Accounts) truy cập phiếu thu N31923: HTTP {r_test.status_code}")
        if r_test.status_code == 200:
            print("  -> User N31911 CÓ QUYỀN TRUY CẬP phiếu thu này qua BU hierarchy!")
        else:
            print(f"  -> Không truy cập chéo BU được: {r_test.text[:200]}")

    # 2. Tìm kiếm định nghĩa nút 'Released GL Journal' trong hệ thống
    dealer_n31923 = next((d for d in dealers if d.get("dealer_code") == "N31923"), None)
    h_23 = {
        "Cookie": dealer_n31923["cookie"],
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }

    print("\n--- TÌM WEBRESOURCES LIÊN QUAN ĐẾN RECEIPT HOẶC GL JOURNAL ---")
    r_wr = requests.get(f"{BASE_API_URL}/webresourceset?$filter=contains(name,'receipt') and contains(name,'.js')&$select=name&$top=10", headers=h_23, timeout=15)
    if r_wr.status_code == 200:
        for w in r_wr.json().get("value", []):
            print(f"  • WebResource: {w.get('name')}")
            # Đọc thử nội dung
            try:
                r_c = requests.get(f"{BASE_API_URL}/webresourceset({w.get('webresourceid')})?$select=content", headers=h_23, timeout=10)
                if r_c.status_code == 200:
                    import base64
                    raw = base64.b64decode(r_c.json().get("content", "")).decode("utf-8", errors="ignore")
                    if "Released GL Journal" in raw or "GL Journal" in raw or "gljournal" in raw.lower():
                        print(f"    --> TÌM THẤY 'GL Journal' trong {w.get('name')}!")
                        for line in raw.split("\n"):
                            if "gl" in line.lower() or "journal" in line.lower() or "sap" in line.lower():
                                print(f"        {line.strip()[:150]}")
            except Exception:
                pass

    # 3. Kiểm tra xem có Workflow hoặc Custom Action nào có thể chạy được không
    print("\n--- TÌM WORKFLOW / PROCESS LIÊN QUAN ĐẾN PHIẾU THU ---")
    r_wf = requests.get(f"{BASE_API_URL}/workflows?$filter=primaryentity eq 'xts_accountreceivablereceipt' and statecode eq 1 and type eq 1&$select=name,workflowid,category&$top=20", headers=h_23, timeout=15)
    if r_wf.status_code == 200:
        for wf in r_wf.json().get("value", []):
            print(f"  • Workflow: {wf.get('name')} (Category: {wf.get('category')}, ID: {wf.get('workflowid')})")

if __name__ == "__main__":
    main()
