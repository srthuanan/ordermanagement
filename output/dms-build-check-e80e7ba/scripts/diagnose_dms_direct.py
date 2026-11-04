# -*- coding: utf-8 -*-
import json
import requests
from datetime import datetime, timedelta

def main():
    with open("dms_dealers_config.json", "r", encoding="utf-8") as f:
        dealers = json.load(f)

    d13 = next((d for d in dealers if d.get("dealer_code") == "N31913"), None)
    if not d13:
        print("Không tìm thấy N31913")
        return

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

    car_id = "c7e8aacd-f300-ee11-8f6d-000d3a85c5df"
    car_name = "10A1 - VF 5 xe nguồn lực 02"

    # 1. Query lịch của CHÍNH XE NÀY
    bk_url = f"{base_url}/bookableresourcebookings?$filter=_resource_value eq {car_id}&$orderby=createdon desc&$top=1"
    r_bk = requests.get(bk_url, headers=headers)
    print(f"Status query lịch của xe '{car_name}': {r_bk.status_code}")
    
    sample = None
    if r_bk.status_code == 200:
        bookings = r_bk.json().get("value", [])
        print(f"Tìm thấy {len(bookings)} lịch trước đây:")
        if bookings:
            sample = bookings[0]
            for k, val in sample.items():
                if not k.startswith("@") and val is not None:
                    print(f"   {k}: {val}")

    if not sample:
        # Nếu xe này chưa có lịch, lấy lịch gần nhất trên toàn showroom
        gen_url = f"{base_url}/bookableresourcebookings?$orderby=createdon desc&$top=1"
        r_gen = requests.get(gen_url, headers=headers)
        if r_gen.status_code == 200:
            sample = r_gen.json().get("value", [])[0]
            print("\nLấy mẫu chung của showroom:")
            for k, val in sample.items():
                if not k.startswith("@") and val is not None:
                    print(f"   {k}: {val}")

    # 2. Query Event xem Sự kiện nào đang ACTIVE cho showroom Thuận An (N31913)
    ev_url = f"{base_url}/xts_commons?$filter=contains(xts_common1,'N31913') or contains(xts_common1,'TDE')&$top=5&$select=xts_commonid,xts_common1"
    r_ev = requests.get(ev_url, headers=headers)
    print(f"\nStatus query Sự kiện (xts_commons): {r_ev.status_code}")
    if r_ev.status_code == 200:
        events = r_ev.json().get("value", [])
        print(f"Tìm thấy {len(events)} sự kiện:")
        for ev in events:
            print(f" - {ev.get('xts_common1')} (ID: {ev.get('xts_commonid')})")

    # 3. Query Model xem VF 5 có ID là gì trong xts_vehiclemodels
    vm_url = f"{base_url}/xts_vehiclemodels?$filter=contains(xts_vehiclemodel1,'VF 5') or contains(xts_vehiclemodel1,'VF5')&$top=5&$select=xts_vehiclemodelid,xts_vehiclemodel1"
    r_vm = requests.get(vm_url, headers=headers)
    print(f"\nStatus query Model VF 5 (xts_vehiclemodels): {r_vm.status_code}")
    if r_vm.status_code == 200:
        models = r_vm.json().get("value", [])
        print(f"Tìm thấy {len(models)} model:")
        for m in models:
            print(f" - {m.get('xts_vehiclemodel1')} (ID: {m.get('xts_vehiclemodelid')})")

    # 4. Thử tạo 1 lịch mới vào khung giờ chiều nay
    now = datetime.now()
    future_start = now.replace(hour=15, minute=0, second=0, microsecond=0)
    future_end = future_start + timedelta(minutes=15)

    print(f"\n🚀 Đang test tạo lịch lái thử vào: {future_start.isoformat()}Z")

    payload = {
        "name": f"Test Agent - Lái thử {car_name}",
        "starttime": future_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "endtime": future_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration": 15,
        "itv_name": "Nguyễn Văn Vũ",
        "itv_phone": "0975182330",
        "itv_email": "null@gmail.com",
        "itv_vfdivision": 20,
        "itv_vehiclemodeltext": sample.get("itv_vehiclemodeltext", "VF 8"),
        "itv_state": 960810000,
        "bookingtype": 1,
        "statuscode": 1,
        "msdyn_effort": 1,
        "msdyn_bookingmethod": 690970003,
        "itv_externaldata": sample.get("itv_externaldata", '{"type":"Test_Drive_Event_Car_2023","surveyname":"Test_Drive_Event_Car_2023","toonline":false}'),
        "Resource@odata.bind": f"/bookableresources({car_id})",
        "BookingStatus@odata.bind": f"/bookingstatuses({sample.get('_bookingstatus_value', '026bdcef-9257-4c10-9e49-c92539b883d6')})"
    }

    if sample.get("_itv_testdriveeventname_value"):
        payload["itv_testdriveeventname@odata.bind"] = f"/xts_commons({sample['_itv_testdriveeventname_value']})"
    if sample.get("_itv_vehiclemodel_value"):
        payload["itv_vehiclemodel@odata.bind"] = f"/xts_vehiclemodels({sample['_itv_vehiclemodel_value']})"
    if sample.get("_itv_businessunit_value"):
        payload["itv_businessunit@odata.bind"] = f"/businessunits({sample['_itv_businessunit_value']})"

    create_url = f"{base_url}/bookableresourcebookings"
    r_create = requests.post(create_url, headers=headers, json=payload)
    print(f"\nKết quả tạo lịch: Status {r_create.status_code}")
    print("Response text:", r_create.text)

if __name__ == "__main__":
    main()
