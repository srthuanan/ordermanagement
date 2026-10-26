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

    # 1. Tìm các bản ghi trong hình: BK-2026-10-17-719948, BK-2026-10-17-719935...
    print("--- 1. Kiểm tra chi tiết các bản ghi BK-2026-10-17 ---")
    url = f"{base_url}/bookableresourcebookings?$filter=contains(name,'BK-2026-10-17')&$top=3&$orderby=createdon desc"
    r = requests.get(url, headers=headers)
    print("Status:", r.status_code)
    if r.status_code == 200:
        bookings = r.json().get("value", [])
        for b in bookings:
            print(f"\nName: {b.get('name')}")
            print(f"Created On: {b.get('createdon')}")
            print(f"Customer Name: {b.get('itv_name')}")
            print(f"Phone: {b.get('itv_phone')}")
            print(f"Start: {b.get('starttime')} -> End: {b.get('endtime')}")
            # In các trường có giá trị liên quan đến mã hoặc name
            for k, v in b.items():
                if "name" in k.lower() or "code" in k.lower() or "number" in k.lower():
                    print(f"  {k}: {v}")

    # 2. Thử tạo 1 booking mà KHÔNG TRUYỀN trường 'name' xem hệ thống có tự sinh Auto-number BK-... không!
    # Hoặc nếu không truyền name thì DMS có tự sinh mã không?
    print("\n--- 2. Thử tạo booking KHÔNG CÓ trường 'name' ---")
    car_id = "fa65fb33-1484-f111-ab0e-000d3a8213ad"
    bu_id = "360e2f16-ba9d-ef11-8a6b-6045bd5754c8"
    selected_event_id = "bb96eb15-85cf-f111-a05b-00224817239a"

    payload_no_name = {
        # "name" để trống hoặc không truyền
        "starttime": "2026-10-26T14:00:00Z",
        "endtime": "2026-10-26T14:15:00Z",
        "duration": 15,
        "itv_name": "Test Auto Number",
        "itv_phone": "0988776655",
        "itv_email": "null@gmail.com",
        "itv_vfdivision": 20,
        "itv_vehiclemodeltext": "VF 2",
        "itv_state": 960810000,
        "bookingtype": 1,
        "statuscode": 1,
        "msdyn_effort": 1,
        "msdyn_bookingmethod": 690970003,
        "itv_externaldata": '{"type":"Test_Drive_Event_Car_2023","surveyname":"Test_Drive_Event_Car_2023","toonline":false}',
        "Resource@odata.bind": f"/bookableresources({car_id})",
        "BookingStatus@odata.bind": "/bookingstatuses(026bdcef-9257-4c10-9e49-c92539b883d6)",
        "msdyn_ResourceRequirement@odata.bind": "/msdyn_resourcerequirements(97d66c26-1ead-ed11-83ff-000d3a85cb76)",
        "itv_testdriveeventname@odata.bind": "/xts_commons(cbdf98e1-53ca-ed11-b596-002248ebf467)",
        "itv_testdriveeventid@odata.bind": f"/itv_testdriveevents({selected_event_id})",
        "itv_vehiclemodel@odata.bind": "/xts_vehiclemodels(e92552f3-647b-f111-ab0f-002248ee5474)",
        "itv_businessunit@odata.bind": f"/businessunits({bu_id})"
    }

    create_url = f"{base_url}/bookableresourcebookings"
    r_create = requests.post(create_url, headers=headers, json=payload_no_name)
    print("Status khi không truyền name:", r_create.status_code)
    if r_create.status_code in [200, 201, 204]:
        entity_id_url = r_create.headers.get("OData-EntityId")
        print("Tạo thành công không cần name! Entity ID:", entity_id_url)
        # Truy vấn lại bản ghi này để xem trường 'name' mang giá trị gì!
        if entity_id_url:
            r_get = requests.get(entity_id_url, headers=headers)
            if r_get.status_code == 200:
                created_record = r_get.json()
                print(f"👉 GIÁ TRỊ TRƯỜNG 'name' TỰ ĐỘNG ĐƯỢC HỆ THỐNG GÁN LÀ: {created_record.get('name')}")
    else:
        print("Lỗi khi không truyền name:", r_create.text)

if __name__ == "__main__":
    main()
