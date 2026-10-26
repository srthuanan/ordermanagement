# -*- coding: utf-8 -*-
import os
import re
import sys
import json
import time
from datetime import datetime, timedelta
import openpyxl
import requests

EXCEL_PATH = r"C:\Users\Pham Thanh Nhan\Downloads\DATA.xlsx"
CONFIG_FILE = "dms_dealers_config.json"
BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"

# BẢNG ÁNH XẠ CHUẨN XÁC GIỮA DÒNG XE TRONG FILE VỚI CẤU HÌNH DMS
# (Model Text, Model GUID, Resource Name, Resource GUID)
MODEL_MAPPING = {
    "vf2": {
        "model_text": "VF 2",
        "model_id": "e92552f3-647b-f111-ab0f-002248ee5474",
        "resource_name": "B012 - VF 2 xe lái thử 01",
        "resource_id": "fa65fb33-1484-f111-ab0e-000d3a8213ad"
    },
    "vf3": {
        "model_text": "VF 3",
        "model_id": "5f92f6b8-36d1-ee11-9079-6045bd55e245",
        "resource_name": "B016 - VF 3 xe lái thử 01",
        "resource_id": "95d37686-8d9f-f111-b8dd-7ced8dff8e86"
    },
    "vf5": {
        "model_text": "VF 5",
        "model_id": "24166839-a26f-ed11-81ac-000d3a8560ce",
        "resource_name": "B016 - VF 5 xe nguồn lực 01",
        "resource_id": "a9d37686-8d9f-f111-b8dd-7ced8dff8e86"
    },
    "vf6": {
        "model_text": "VF 6",
        "model_id": "cc202d99-ffc6-ed11-b597-002248ebf6a1",
        "resource_name": "B016 - VF 6 xe nguồn lực 01",
        "resource_id": "bdd37686-8d9f-f111-b8dd-7ced8dff8e86"
    },
    "vf7": {
        "model_text": "VF 7",
        "model_id": "76cbbda5-ffc6-ed11-b597-002248ebf6a1",
        "resource_name": "B016 - VF 7 xe nguồn lực 01",
        "resource_id": "d1d37686-8d9f-f111-b8dd-7ced8dff8e86"
    },
    "vf8": {
        "model_text": "VF 8",
        "model_id": "33f3cf91-3d6e-ec11-8943-000d3a8178c3",
        "resource_name": "VF 8 Testdrive Gen",
        "resource_id": "70356694-6509-ed11-82e5-000d3a85f5f3"
    },
    "vf9": {
        "model_text": "VF 9",
        "model_id": "94b05ab6-3d6e-ec11-8943-000d3a8178c3",
        "resource_name": "B016 - VF 9 xe nguồn lực 01",
        "resource_id": "f9d37686-8d9f-f111-b8dd-7ced8dff8e86"
    },
    "limo": {
        "model_text": "Limo Green",
        "model_id": "afd6463f-8001-f011-bae3-000d3a804dd2",
        "resource_name": "B016 - Limo Green xe lái thử 01",
        "resource_id": "67d37686-8d9f-f111-b8dd-7ced8dff8e86"
    },
    "mpv7": {
        "model_text": "MPV 7",
        "model_id": "d73828bd-e562-f011-bec2-6045bd5b3b5d",
        "resource_name": "B012 - MPV 7 xe lái thử 02",
        "resource_id": "af96ce11-e220-f111-88b2-002248ec5aac"
    }
}

def resolve_model_cfg(raw_text):
    t = str(raw_text or "").strip().lower()
    if "vf2" in t: return MODEL_MAPPING["vf2"]
    if "vf3" in t: return MODEL_MAPPING["vf3"]
    if "vf5" in t: return MODEL_MAPPING["vf5"]
    if "vf6" in t: return MODEL_MAPPING["vf6"]
    if "vf7" in t: return MODEL_MAPPING["vf7"]
    if "vf8" in t: return MODEL_MAPPING["vf8"]
    if "vf9" in t: return MODEL_MAPPING["vf9"]
    if "limo" in t: return MODEL_MAPPING["limo"]
    if "mpv" in t or "mpv7" in t: return MODEL_MAPPING["mpv7"]
    return MODEL_MAPPING["vf2"] # default

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    print("🚗 KHỞI ĐỘNG TIẾN TRÌNH NHẬP HÀNG LOẠT LỊCH LÁI THỬ TỪ FILE DATA.xlsx", flush=True)

    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Không tìm thấy file tại: {EXCEL_PATH}", flush=True)
        return

    # 1. Đọc cookie Showroom N31913
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        dealers = json.load(f)
    d13 = next((d for d in dealers if d.get("dealer_code") == "N31913"), None)
    if not d13 or not d13.get("cookie"):
        print("❌ Không tìm thấy cookie của showroom N31913!", flush=True)
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

    # 2. Đọc file DATA.xlsx
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        print("❌ File Excel rỗng!", flush=True)
        return

    # Cột 0: Họ tên, Cột 1: SĐT, Cột 2: GPLX/CCCD, Cột 3: Dòng xe
    customers = []
    for r_idx, row in enumerate(rows[1:], start=2):
        if not any(row):
            continue
        name = str(row[0] or "").strip()
        phone = str(row[1] or "").strip() if len(row) > 1 else ""
        cccd = str(row[2] or "").strip() if len(row) > 2 else ""
        raw_model = str(row[3] or "").strip() if len(row) > 3 else ""

        if not name or name == "None":
            continue

        # Chuẩn hóa SĐT
        phone = re.sub(r"[^0-9]", "", phone)
        if len(phone) == 9 and not phone.startswith("0"):
            phone = "0" + phone

        model_cfg = resolve_model_cfg(raw_model)

        customers.append({
            "row": r_idx,
            "name": name,
            "phone": phone,
            "cccd": cccd,
            "raw_model": raw_model,
            "model_cfg": model_cfg
        })

    total = len(customers)
    print(f"📊 Đã nạp thành công {total} khách hàng từ file DATA.xlsx.", flush=True)
    if total == 0:
        return

    # Chia làm 2 ngày: 24/10/2026 và 25/10/2026
    half = (total + 1) // 2
    batch_day24 = customers[:half]
    batch_day25 = customers[half:]
    print(f"📅 Ngày 24/10/2026: {len(batch_day24)} khách hàng (từ ca 08:30 sáng)", flush=True)
    print(f"📅 Ngày 25/10/2026: {len(batch_day25)} khách hàng (từ ca 08:30 sáng)", flush=True)

    bu_id = "360e2f16-ba9d-ef11-8a6b-6045bd5754c8"   # BU Showroom Thuận An
    event_id = "bb96eb15-85cf-f111-a05b-00224817239a" # N31913-TDE-1026-0001
    event_common_id = "cbdf98e1-53ca-ed11-b596-002248ebf467"
    status_id = "026bdcef-9257-4c10-9e49-c92539b883d6"
    requirement_id = "97d66c26-1ead-ed11-83ff-000d3a85cb76"

    # Lập lịch
    full_schedule = []
    
    # 24/10/2026
    start_dt_24 = datetime(2026, 10, 24, 8, 30, 0)
    for idx, c in enumerate(batch_day24):
        slot_vn = start_dt_24 + timedelta(minutes=idx * 15)
        slot_utc = slot_vn - timedelta(hours=7)
        end_utc = slot_utc + timedelta(minutes=15)
        full_schedule.append((c, slot_utc, end_utc, slot_vn, "24/10/2026"))

    # 25/10/2026
    start_dt_25 = datetime(2026, 10, 25, 8, 30, 0)
    for idx, c in enumerate(batch_day25):
        slot_vn = start_dt_25 + timedelta(minutes=idx * 15)
        slot_utc = slot_vn - timedelta(hours=7)
        end_utc = slot_utc + timedelta(minutes=15)
        full_schedule.append((c, slot_utc, end_utc, slot_vn, "25/10/2026"))

    print("\n🚀 BẮT ĐẦU ĐỒNG BỘ VÀO VINFAST DMS...", flush=True)
    success_count = 0
    fail_count = 0
    results_log = []

    for idx, (c, st_utc, et_utc, st_vn, day_label) in enumerate(full_schedule, start=1):
        m = c["model_cfg"]
        payload = {
            # Bỏ trường 'name' để hệ thống tự động sinh số chuẩn: BK-YYYY-MM-DD-xxxxxx
            "starttime": st_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "endtime": et_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "duration": 15,
            "itv_name": c["name"],
            "itv_phone": c["phone"],
            "itv_email": "null@gmail.com",
            "itv_vfdivision": 20,
            "itv_vehiclemodeltext": m["model_text"],
            "itv_state": 960810000,
            "bookingtype": 1,
            "statuscode": 1,
            "msdyn_effort": 1,
            "msdyn_bookingmethod": 690970003,
            "itv_externaldata": '{"type":"Test_Drive_Event_Car_2023","surveyname":"Test_Drive_Event_Car_2023","toonline":false}',
            "Resource@odata.bind": f"/bookableresources({m['resource_id']})",
            "BookingStatus@odata.bind": f"/bookingstatuses({status_id})",
            "msdyn_ResourceRequirement@odata.bind": f"/msdyn_resourcerequirements({requirement_id})",
            "itv_testdriveeventname@odata.bind": f"/xts_commons({event_common_id})",
            "itv_testdriveeventid@odata.bind": f"/itv_testdriveevents({event_id})",
            "itv_vehiclemodel@odata.bind": f"/xts_vehiclemodels({m['model_id']})",
            "itv_businessunit@odata.bind": f"/businessunits({bu_id})"
        }

        time_str_vn = st_vn.strftime("%H:%M")
        try:
            resp = requests.post(f"{BASE_API_URL}/bookableresourcebookings", headers=headers, json=payload, timeout=20)
            if resp.status_code in [200, 201, 204]:
                entity_url = resp.headers.get("OData-EntityId", "")
                success_count += 1
                print(f"[{idx}/{total}] ✅ [{day_label} {time_str_vn}] {c['name']} ({c['phone']}) - Xe: {m['model_text']} -> Thành công!", flush=True)
                results_log.append({"idx": idx, "name": c["name"], "phone": c["phone"], "day": day_label, "time": time_str_vn, "model": m["model_text"], "status": "OK"})
            else:
                fail_count += 1
                err_msg = resp.text[:120]
                print(f"[{idx}/{total}] ❌ [{day_label} {time_str_vn}] {c['name']} - Xe: {m['model_text']} -> Lỗi {resp.status_code}: {err_msg}", flush=True)
                results_log.append({"idx": idx, "name": c["name"], "phone": c["phone"], "day": day_label, "time": time_str_vn, "model": m["model_text"], "status": "FAIL", "error": err_msg})
        except Exception as e:
            fail_count += 1
            print(f"[{idx}/{total}] ❌ [{day_label} {time_str_vn}] {c['name']} -> Exception: {e}", flush=True)
            results_log.append({"idx": idx, "name": c["name"], "status": "EXCEPTION", "error": str(e)})

        time.sleep(0.12)

    print("\n================== KẾT QUẢ ĐỒNG BỘ HOÀN TẤT ==================", flush=True)
    print(f"🎉 THÀNH CÔNG: {success_count} / {total} khách hàng", flush=True)
    print(f"❌ THẤT BẠI: {fail_count} / {total} khách hàng", flush=True)

    with open("scripts/import_excel_report.json", "w", encoding="utf-8") as rf:
        json.dump({
            "total": total,
            "success_count": success_count,
            "fail_count": fail_count,
            "results": results_log
        }, rf, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
