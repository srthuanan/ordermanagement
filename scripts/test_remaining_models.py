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

    bu_id = "360e2f16-ba9d-ef11-8a6b-6045bd5754c8"
    event_id = "bb96eb15-85cf-f111-a05b-00224817239a"
    event_common_id = "cbdf98e1-53ca-ed11-b596-002248ebf467"
    status_id = "026bdcef-9257-4c10-9e49-c92539b883d6"
    requirement_id = "97d66c26-1ead-ed11-83ff-000d3a85cb76"

    test_models = [
        ("VF 5", "24166839-a26f-ed11-81ac-000d3a8560ce", "a9d37686-8d9f-f111-b8dd-7ced8dff8e86"), # B016 - VF 5
        ("VF 6", "cc202d99-ffc6-ed11-b597-002248ebf6a1", "bdd37686-8d9f-f111-b8dd-7ced8dff8e86"), # B016 - VF 6
        ("VF 7", "76cbbda5-ffc6-ed11-b597-002248ebf6a1", "d1d37686-8d9f-f111-b8dd-7ced8dff8e86"), # B016 - VF 7
        ("VF 9", "94b05ab6-3d6e-ec11-8943-000d3a8178c3", "f9d37686-8d9f-f111-b8dd-7ced8dff8e86"), # B016 - VF 9
        ("Limo Green", "afd6463f-8001-f011-bae3-000d3a804dd2", "67d37686-8d9f-f111-b8dd-7ced8dff8e86"), # B016 - Limo Green
    ]

    for model_text, model_id, res_id in test_models:
        payload = {
            "starttime": "2026-10-24T02:00:00Z",
            "endtime": "2026-10-24T02:15:00Z",
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
        print(f"Model '{model_text}': Status {r.status_code}")
        if r.status_code not in [200, 201, 204]:
            print(f"  -> Error: {r.text}")
        else:
            print(f"  -> OK: {r.headers.get('OData-EntityId')}")

if __name__ == "__main__":
    main()
