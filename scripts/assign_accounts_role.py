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
    user_id = "4fec8000-0a47-f111-bec7-000d3a85972b"
    headers = {
        "Cookie": dealer_n31923["cookie"],
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }

    # 1. Tìm role 'VF Accounts' thuộc Business Unit của user N31923
    # BusinessUnitId = 1df53584-6745-f111-bec7-6045bd585385
    print("=== TÌM ROLE 'VF Accounts' ===")
    r_role = requests.get(
        f"{BASE_API_URL}/roles?$filter=name eq 'VF Accounts' and _businessunitid_value eq 1df53584-6745-f111-bec7-6045bd585385&$select=name,roleid",
        headers=headers,
        timeout=15
    )
    role_id = None
    if r_role.status_code == 200 and r_role.json().get("value"):
        role = r_role.json()["value"][0]
        role_id = role.get("roleid")
        print(f"✅ Tìm thấy role 'VF Accounts' cho BU N31923: RoleId = {role_id}")
    else:
        # Tìm bất kỳ role 'VF Accounts'
        r_role2 = requests.get(
            f"{BASE_API_URL}/roles?$filter=name eq 'VF Accounts'&$select=name,roleid,_businessunitid_value&$top=5",
            headers=headers,
            timeout=15
        )
        if r_role2.status_code == 200 and r_role2.json().get("value"):
            for ro in r_role2.json().get("value"):
                print(f"  • Role: {ro.get('name')} | ID: {ro.get('roleid')} | BU: {ro.get('_businessunitid_value')}")
            role_id = r_role2.json()["value"][0].get("roleid")

    if not role_id:
        print("❌ Không tìm thấy role 'VF Accounts' trong hệ thống.")
        return

    # 2. Thử gán role VF Accounts cho User N31923 qua API
    print(f"\n=== THỬ GÁN ROLE 'VF Accounts' CHO USER {user_id} ===")
    assign_url = f"{BASE_API_URL}/systemusers({user_id})/systemuserroles_association/$ref"
    body = {
        "@odata.id": f"{BASE_API_URL}/roles({role_id})"
    }
    r_assign = requests.post(assign_url, headers=headers, json=body, timeout=15)
    print(f"Kết quả gán role: HTTP {r_assign.status_code}")
    if r_assign.status_code in [200, 204]:
        print("🎉 THÀNH CÔNG! Đã gán role 'VF Accounts' cho tài khoản N31923!")
    else:
        try:
            print(f"Phản hồi từ server: {r_assign.json()}")
        except Exception:
            print(f"Phản hồi: {r_assign.text[:300]}")

if __name__ == "__main__":
    main()
