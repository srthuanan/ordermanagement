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

    # Lấy danh sách itv_testdriveevents hiện hoạt của BU Thuận An
    bu_id = "360e2f16-ba9d-ef11-8a6b-6045bd5754c8"
    url_events = f"{base_url}/itv_testdriveevents?$filter=_owningbusinessunit_value eq {bu_id} and statecode eq 0&$orderby=createdon desc"
    r_ev = requests.get(url_events, headers=headers)
    print("Danh sách sự kiện lái thử của Thuận An:", r_ev.status_code)
    events = r_ev.json().get("value", [])
    for ev in events:
        print(f"  - Event: {ev.get('itv_code')} | Tên: {ev.get('itv_name')} | ID: {ev.get('itv_testdriveeventid')}")

    selected_event_id = events[0].get("itv_testdriveeventid") if events else "bb96eb15-85cf-f111-a05b-00224817239a"

    # Test tạo booking với đầy đủ itv_testdriveeventid
    car_id = "fa65fb33-1484-f111-ab0e-000d3a8213ad"
    now = datetime.now()
    start_time = now.replace(hour=17, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=15)

    payload = {
        "name": "Test Event Binding - Lái thử VF 2",
        "starttime": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "endtime": end_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration": 15,
        "itv_name": "Nguyễn Văn Vũ",
        "itv_phone": "0975182330",
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
    r_create = requests.post(create_url, headers=headers, json=payload)
    print(f"\nKết quả tạo booking kèm itv_testdriveeventid: Status {r_create.status_code}")
    if r_create.status_code in [200, 201, 204]:
        entity_url = r_create.headers.get("OData-EntityId")
        print("TẠO THÀNH CÔNG RỰC RỠ! OData-EntityId:", entity_url)
    else:
        print("Lỗi:", r_create.text)

if __name__ == "__main__":
    main()
