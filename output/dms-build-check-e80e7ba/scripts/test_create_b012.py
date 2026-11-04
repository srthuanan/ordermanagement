# -*- coding: utf-8 -*-
import json
import requests
from datetime import datetime, timedelta

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

    # Test với xe B012 - MPV 7 xe lái thử 05 (Đã từng thành công của Thuận An)
    # hoặc B012 - VF 5 xe nguồn lực 01
    car_id = "b3075d43-e220-f111-88b2-002248ec5aac"
    car_name = "B012 - MPV 7 xe lái thử 05"
    
    # Lấy lịch mẫu của chính xe này
    r_bk = requests.get(f"{base_url}/bookableresourcebookings?$filter=_resource_value eq {car_id}&$top=1&$orderby=createdon desc", headers=headers)
    sample = r_bk.json().get("value", [])[0]

    now = datetime.now()
    future_start = now.replace(hour=15, minute=30, second=0, microsecond=0)
    future_end = future_start + timedelta(minutes=15)

    payload = {
        "name": f"Nguyễn Văn Vũ - Lái thử {car_name}",
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
    print(f"\nKết quả tạo lịch cho xe B012: Status {r_create.status_code}")
    print("Response text:", r_create.text)

if __name__ == "__main__":
    main()
