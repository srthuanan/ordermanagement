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

    # 1. Tìm trong xts_commons
    print("--- 1. Tìm N31913-TDE-1026-0001 trong xts_commons ---")
    try:
        url = f"{base_url}/xts_commons?$filter=contains(xts_common,'N31913-TDE-1026-0001') or contains(xts_description,'N31913-TDE-1026-0001')"
        r = requests.get(url, headers=headers)
        print("xts_commons status:", r.status_code)
        if r.status_code == 200:
            data = r.json().get("value", [])
            print(f"Tìm thấy {len(data)} bản ghi:")
            for item in data:
                print(item)
    except Exception as e:
        print("Error xts_commons:", e)

    # 2. Tìm entity liên quan đến Test Drive Event
    # Thử các bảng có thể là test drive event
    possible_entities = [
        "itv_testdriveevents",
        "itv_events",
        "campaigns",
        "itv_campaigns"
    ]
    for ent in possible_entities:
        try:
            url = f"{base_url}/{ent}?$top=5"
            r = requests.get(url, headers=headers)
            print(f"\nKiểm tra entity {ent}: Status {r.status_code}")
            if r.status_code == 200:
                vals = r.json().get("value", [])
                print(f"Entity {ent} tồn tại! Số bản ghi: {len(vals)}")
                for v in vals:
                    # in các trường có giá trị
                    clean = {k: val for k, val in v.items() if val and not k.startswith("@")}
                    print("  Sample:", clean)
                    break
        except Exception as e:
            print(f"Error {ent}:", e)

    # 3. Kiểm tra các trường trên bookableresourcebooking gần đây nhất xem trường nào lưu 'N31913-TDE-1026-0001'
    print("\n--- 3. Lấy 5 booking gần nhất của Thuận An ---")
    try:
        url = f"{base_url}/bookableresourcebookings?$orderby=createdon desc&$top=5"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            for b in r.json().get("value", []):
                for k, v in b.items():
                    if isinstance(v, str) and ("N31913-TDE" in v or "1026-0001" in v):
                        print(f"MATCH: {k} = {v}")
                    if "event" in k.lower() or "tde" in k.lower():
                        print(f"Event field: {k} = {v}")
    except Exception as e:
        print("Error checking bookings:", e)

if __name__ == "__main__":
    main()
