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

    # Tìm chính xác Model GUID của VF 8, VF 9, Limo
    url_models = f"{base_url}/xts_vehiclemodels?$filter=statecode eq 0&$select=xts_vehiclemodelid,xts_vehiclemodel"
    r = requests.get(url_models, headers=headers)
    models_dict = {}
    for m in r.json().get("value", []):
        models_dict[m.get("xts_vehiclemodel").upper()] = m.get("xts_vehiclemodelid")
        if "LIMO" in m.get("xts_vehiclemodel").upper() or "VF 9" in m.get("xts_vehiclemodel").upper() or "VF 8" in m.get("xts_vehiclemodel").upper():
            print(f"Matched Model: {m.get('xts_vehiclemodel')} -> {m.get('xts_vehiclemodelid')}")

    # Bảng ánh xạ từ Dòng xe trong Excel -> (Model ID, Model Text, Resource ID, Resource Name)
    # Các dòng xe trong file:
    # 'vf2': VF 2
    # 'vf3': VF 3
    # 'vf5': VF 5
    # 'vf6': VF 6
    # 'vf7': VF 7
    # 'vf8 all new', 'vf8np': VF 8
    # 'vf9': VF 9
    # 'Limo': Limo Green
    # 'mpv7': MPV 7

    bu_id = "360e2f16-ba9d-ef11-8a6b-6045bd5754c8"
    event_id = "bb96eb15-85cf-f111-a05b-00224817239a" # N31913-TDE-1026-0001
    event_common_id = "cbdf98e1-53ca-ed11-b596-002248ebf467"
    status_id = "026bdcef-9257-4c10-9e49-c92539b883d6"
    requirement_id = "97d66c26-1ead-ed11-83ff-000d3a85cb76"

    # Test thử tạo 1 lượt cho VF 3 và VF 8 xem có báo "Unable to find any vehicle" không
    test_cases = [
        ("VF 3", models_dict.get("VF 3"), "95d37686-8d9f-f111-b8dd-7ced8dff8e86"), # B016 - VF 3 xe lái thử 01
        ("VF 8", models_dict.get("VF 8"), "70356694-6509-ed11-82e5-000d3a85f5f3"), # VF 8 Testdrive Gen
        ("MPV 7", models_dict.get("MPV 7"), "af96ce11-e220-f111-88b2-002248ec5aac"), # B012 - MPV 7 xe lái thử 02
    ]

    for model_text, model_id, res_id in test_cases:
        now = datetime.now()
        payload = {
            "starttime": "2026-10-24T01:30:00Z",
            "endtime": "2026-10-24T01:45:00Z",
            "duration": 15,
            "itv_name": f"Test {model_text}",
            "itv_phone": "0987654321",
            "itv_email": "null@gmail.com",
            "itv_vfdivision": 20,
            "itv_vehiclemodeltext": model_text,
            "itv_state": 960810000,
            "bookingtype": 1,
            "statuscode": 1,
            "msdyn_effort": 1,
            "msdyn_bookingmethod": 690970003,
            "itv_externaldata": '{"type":"Test_Drive_Event_Car_2023","surveyname":"Test_Drive_Event_Car_2023","toonline":false}',
            "Resource@odata.bind": f"/bookableresources({res_id})",
            "BookingStatus@odata.bind": f"/bookingstatuses({status_id})",
            "msdyn_ResourceRequirement@odata.bind": f"/msdyn_resourcerequirements({requirement_id})",
            "itv_testdriveeventname@odata.bind": f"/xts_commons({event_common_id})",
            "itv_testdriveeventid@odata.bind": f"/itv_testdriveevents({event_id})",
            "itv_vehiclemodel@odata.bind": f"/xts_vehiclemodels({model_id})",
            "itv_businessunit@odata.bind": f"/businessunits({bu_id})"
        }
        r = requests.post(f"{base_url}/bookableresourcebookings", headers=headers, json=payload)
        print(f"Test model '{model_text}' (Resource {res_id}): Status {r.status_code}")
        if r.status_code not in [200, 201, 204]:
            print(f"  -> Error: {r.text}")
        else:
            print(f"  -> SUCCESS: {r.headers.get('OData-EntityId')}")

if __name__ == "__main__":
    main()
