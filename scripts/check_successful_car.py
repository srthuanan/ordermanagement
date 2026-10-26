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

    # Query xe b3075d43-e220-f111-88b2-002248ec5aac
    r = requests.get(f"{base_url}/bookableresources(b3075d43-e220-f111-88b2-002248ec5aac)", headers=headers)
    print("Status query xe thành công:", r.status_code)
    if r.status_code == 200:
        car = r.json()
        print("\n=== CHI TIẾT XE ĐÃ TỪNG ĐẶT LỊCH THÀNH CÔNG ===")
        for k, v in car.items():
            if not k.startswith("@") and v is not None:
                print(f"   {k}: {v}")

    # Query 10 lịch gần nhất trên toàn showroom N31913 để xem danh sách các xe được dùng
    bk_url = f"{base_url}/bookableresourcebookings?$filter=_itv_businessunit_value eq 360e2f16-ba9d-ef11-8a6b-6045bd5754c8&$top=10&$orderby=createdon desc&$select=name,createdon,_resource_value,itv_name,itv_vehiclemodeltext"
    r_bk = requests.get(bk_url, headers=headers)
    if r_bk.status_code == 200:
        print("\n=== 10 LỊCH LÁI THỬ GẦN NHẤT CỦA SHOWROOM THUẬN AN ===")
        for b in r_bk.json().get("value", []):
            print(f" - Khách: {b.get('itv_name')} | Ngày tạo: {b.get('createdon')} | Xe Resource ID: {b.get('_resource_value')} | Model: {b.get('itv_vehiclemodeltext')}")

if __name__ == "__main__":
    main()
