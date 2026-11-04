# -*- coding: utf-8 -*-
import json
import os
import requests

def main():
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        dealers = json.load(f)

    BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.2"

    dealer = next((d for d in dealers if d.get("dealer_code") == "N31923"), None)
    headers = {
        "Cookie": dealer["cookie"],
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }

    # 1. Tìm entity liên quan đến journal
    print("=== 1. TÌM ENTITY JOURNAL TRONG DMS ===")
    ent_url = f"{BASE_API_URL}/EntityDefinitions?$select=LogicalName,ObjectTypeCode,DisplayName&$filter=contains(LogicalName,'journal') or contains(LogicalName,'ledger')"
    try:
        r_ent = requests.get(ent_url, headers=headers, timeout=15)
        if r_ent.status_code == 200:
            for e in r_ent.json().get("value", []):
                dn = e.get("DisplayName", {}).get("UserLocalizedLabel", {}).get("Label", "")
                print(f"  • {e.get('LogicalName')} (OTC={e.get('ObjectTypeCode')}) - {dn}")
        else:
            print(f"  EntityDefinitions HTTP {r_ent.status_code}")
    except Exception as ex:
        print(f"  Lỗi tìm entity: {ex}")

    # 2. Tìm AppAction (Power Fx Button) trên Model-Driven App
    print("\n=== 2. TÌM COMMAND BAR / APPACTION ===")
    act_url = f"{BASE_API_URL}/appactions?$filter=contains(name,'GL') or contains(name,'Journal') or contains(name,'Release')&$select=name,contextentity,onclickeventjavascriptfunctionname,formulaexpression,type&$top=20"
    try:
        r_act = requests.get(act_url, headers=headers, timeout=15)
        if r_act.status_code == 200:
            acts = r_act.json().get("value", [])
            print(f"Tìm thấy {len(acts)} AppActions:")
            for a in acts:
                print(f"  • Name: {a.get('name')} (Entity: {a.get('contextentity')})")
                print(f"    Formula: {a.get('formulaexpression')}")
        else:
            print(f"  AppAction HTTP {r_act.status_code}")
    except Exception as ex:
        print(f"  Lỗi AppAction: {ex}")

    # 3. Kiểm tra Security Roles của tài khoản N31923
    print("\n=== 3. KIỂM TRA SECURITY ROLES CỦA USER N31923 ===")
    user_id = "4fec8000-0a47-f111-bec7-000d3a85972b"
    role_url = f"{BASE_API_URL}/systemusers({user_id})/systemuserroles_association?$select=name,roleid"
    try:
        r_role = requests.get(role_url, headers=headers, timeout=15)
        if r_role.status_code == 200:
            roles = r_role.json().get("value", [])
            print(f"Tài khoản đang có {len(roles)} roles:")
            for r in roles:
                print(f"  - {r.get('name')} (ID: {r.get('roleid')})")
        else:
            print(f"  Roles HTTP {r_role.status_code}")
    except Exception as ex:
        print(f"  Lỗi lấy roles: {ex}")

    # 4. Kiểm tra xem các tài khoản đại lý khác có quyền GL / Accountant không
    print("\n=== 4. KIỂM TRA CÁC USER ĐẠI LÝ KHÁC XEM CÓ ROLE KẾ TOÁN KHÔNG ===")
    for d in dealers:
        d_code = d.get("dealer_code")
        d_cookie = d.get("cookie")
        if not d_cookie:
            continue
        d_h = {
            "Cookie": d_cookie,
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }
        try:
            r_w = requests.get(f"{BASE_API_URL}/WhoAmI", headers=d_h, timeout=10)
            if r_w.status_code == 200:
                uid = r_w.json().get("UserId")
                r_r = requests.get(f"{BASE_API_URL}/systemusers({uid})/systemuserroles_association?$select=name", headers=d_h, timeout=10)
                if r_r.status_code == 200:
                    r_names = [x.get("name") for x in r_r.json().get("value", [])]
                    has_gl = any("kế toán" in n.lower() or "account" in n.lower() or "gl" in n.lower() or "admin" in n.lower() for n in r_names)
                    print(f"  Đại lý {d_code} (User {uid[:8]}...): {len(r_names)} roles | Có vai trò kế toán/admin: {has_gl}")
                    if has_gl:
                        print(f"     Roles: {', '.join(r_names)}")
        except Exception:
            pass

if __name__ == "__main__":
    main()
