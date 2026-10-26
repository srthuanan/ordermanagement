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

    # 1. Lấy toàn bộ danh sách các model xe trong xts_vehiclemodels
    print("--- 1. DANH SÁCH TOÀN BỘ VEHICLE MODELS TRÊN DMS ---")
    url_models = f"{base_url}/xts_vehiclemodels?$filter=statecode eq 0&$select=xts_vehiclemodelid,xts_vehiclemodel,xts_description"
    r_m = requests.get(url_models, headers=headers)
    all_models = {}
    if r_m.status_code == 200:
        for m in r_m.json().get("value", []):
            name = m.get("xts_vehiclemodel")
            mid = m.get("xts_vehiclemodelid")
            all_models[name.lower()] = {"id": mid, "name": name, "desc": m.get("xts_description")}
            print(f"Model: {name} (ID: {mid})")

    # 2. Lấy 100 booking gần nhất của Thuận An để xem thực tế đang dùng Resource nào cho từng Dòng xe
    print("\n--- 2. ÁNH XẠ DÒNG XE VỚI NGUỒN LỰC TRONG 100 BOOKING GẦN NHẤT ---")
    url_b = f"{base_url}/bookableresourcebookings?$filter=_owningbusinessunit_value eq 360e2f16-ba9d-ef11-8a6b-6045bd5754c8&$top=100&$orderby=createdon desc"
    r_b = requests.get(url_b, headers=headers)
    model_to_resource = {}
    if r_b.status_code == 200:
        for b in r_b.json().get("value", []):
            m_name = b.get('_itv_vehiclemodel_value@OData.Community.Display.V1.FormattedValue')
            m_id = b.get('_itv_vehiclemodel_value')
            r_name = b.get('_resource_value@OData.Community.Display.V1.FormattedValue')
            r_id = b.get('_resource_value')
            m_text = b.get('itv_vehiclemodeltext')

            if m_name and r_name:
                key = m_name.strip()
                if key not in model_to_resource:
                    model_to_resource[key] = {
                        "model_id": m_id,
                        "model_text": m_text or m_name,
                        "resource_id": r_id,
                        "resource_name": r_name,
                        "count": 0
                    }
                model_to_resource[key]["count"] += 1

    print("\nBảng mapping thực tế đã được kiểm chứng trên DMS của Showroom:")
    for k, v in model_to_resource.items():
        print(f"Dòng xe '{k}' ({v['count']} lần):")
        print(f"  -> Model ID: {v['model_id']}")
        print(f"  -> Model Text: {v['model_text']}")
        print(f"  -> Resource: {v['resource_name']} (ID: {v['resource_id']})")

    # 3. Lấy toàn bộ bookableresources của Thuận An
    print("\n--- 3. TOÀN BỘ NGUỒN LỰC XE (BOOKABLE RESOURCES) CỦA THUẬN AN ---")
    url_res = f"{base_url}/bookableresources?$filter=statecode eq 0&$select=bookableresourceid,name,resourcetype&$top=50"
    r_res = requests.get(url_res, headers=headers)
    if r_res.status_code == 200:
        for res in r_res.json().get("value", []):
            rname = res.get("name")
            rid = res.get("bookableresourceid")
            if any(k in rname.lower() for k in ["xe", "b012", "b016", "vf", "test", "mpv", "limo"]):
                print(f"Resource: {rname} | ID: {rid}")

if __name__ == "__main__":
    main()
