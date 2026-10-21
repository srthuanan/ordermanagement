# -*- coding: utf-8 -*-
"""
Module: dms_stock_radar.py
Mục đích: Đồng bộ trực tiếp Kho xe, Số máy, Mã DMS, Mã Phiên Bản & GPS Live 
từ VinFast Dynamics OData API lên Supabase Cloud.
Hỗ trợ chạy trên Vercel Serverless Function (Python).
"""

import os
import json
import requests
from datetime import datetime, timezone
import unicodedata

from concurrent.futures import ThreadPoolExecutor

def get_dealers_list():
    # 1. Thử lấy từ Supabase Storage trước (đặc biệt khi chạy trên Vercel Cloud Serverless)
    sb_url = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
    sb_key = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX"
    try:
        supa_url = f"{sb_url}/storage/v1/object/authenticated/yeucauxhd-files/config/dms_dealers_config.json"
        headers = {"apikey": sb_key, "Authorization": f"Bearer {sb_key}"}
        r = requests.get(supa_url, headers=headers, timeout=3)
        if r.status_code == 200 and r.text.strip():
            data = r.json()
            if isinstance(data, list) and data:
                return data
    except Exception:
        pass

    # 2. Local config file
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def remove_diacritics(text):
    if not text: return ""
    norm = unicodedata.normalize('NFD', str(text))
    return "".join(c for c in norm if unicodedata.category(c) != 'Mn').replace('đ', 'd').replace('Đ', 'D').upper()

# Bảng ánh xạ mã showroom DMS chuẩn của 25 Showroom VinFast
SITE_MAP = {
    "2bd660d4-92ad-f111-aaae-000d3a8140c0": "N31925",
    "bf9e5764-ff8f-f111-8076-000d3a821339": "N31924",
    "4cfe574e-b361-ea11-a811-000d3a85937e": "N31901",
    "52b1cce4-4d52-f011-877a-00224816cf50": "N31917",
    "4ce24370-2b15-f011-998a-00224817e379": "N31915",
    "4ee24370-2b15-f011-998a-00224817e379": "N31916",
    "490968e0-9b28-ef11-840b-002248ec8105": "N31902",
    "4b0968e0-9b28-ef11-840b-002248ec8105": "N31903",
    "4d0968e0-9b28-ef11-840b-002248ec8105": "N31904",
    "4f0968e0-9b28-ef11-840b-002248ec8105": "N31905",
    "510968e0-9b28-ef11-840b-002248ec8105": "N31906",
    "530968e0-9b28-ef11-840b-002248ec8105": "N31907",
    "4c4b8713-b539-ef11-a317-002248ec8105": "N31908",
    "f818cbd3-3d7e-ef11-ac21-002248ec8105": "N31910",
    "fa18cbd3-3d7e-ef11-ac21-002248ec8105": "N31911",
    "4de683b5-489c-f011-bbd2-002248ee5962": "N31918",
    "bcfeca24-b1bb-f011-bbd3-6045bd5685f8": "N31920",
    "5c994131-8193-ef11-8a6a-6045bd5754c8": "N31912",
    "30fb9dbe-274a-ef11-a317-6045bd5754c8": "N31909",
    "548d8293-af9d-ef11-8a6b-6045bd5754ce": "N31913",
    "bc71e0bd-b1c6-ef11-b8e9-6045bd5754ce": "N31914",
    "e24d9ffb-8b9e-f011-bbd2-6045bd576695": "N31919",
    "dc66ab0e-6a45-f111-bec7-6045bd585385": "N31923",
    "6f13b85d-f73f-f111-bec6-6045bd5a3372": "N31921",
    "7113b85d-f73f-f111-bec6-6045bd5a3372": "N31922"
}

# Bảng tra cứu phiên bản chuẩn VinFast DMS
DMS_VERSION_MAP = {
    ("VF 3", "PLUS"): "TI1BV",
    ("VF 3", "ECO"): "TI1CV",
    ("VF 3", "BASE"): "GI10V",
    ("VF 5", "PLUS"): "GA1RV",
    ("VF 5", "ECO"): "GA1KV",
    ("VF 6", "PLUS"): "JB12V",
    ("VF 6", "ECO"): "JB10V",
    ("VF 6", "BASE"): "JB10V",
    ("VF 7", "PLUS"): "GC12V",
    ("VF 7", "ECO"): "HC1BV",
    ("VF 7", "BASE"): "HC1BV",
    ("VF 8", "PLUS"): "ND32V",
    ("VF 8", "ECO"): "ND31V",
    ("VF 8", "BASE"): "HC11V",
    ("VF 9", "PLUS"): "NE3MV",
    ("VF 9", "ECO"): "NE3LV",
    ("EC VAN", "BASE"): "TG10V",
    ("EC VAN", "PLUS"): "TG11V",
    ("EC VAN", "SLIDING"): "TG12V",
    ("LIMO", "LIMO"): "SL1VV",
    ("LIMO", "MPV7"): "SL1WV",
    ("VF 2", "ECO"): "TH14V",
    ("VF 2", "MINIO"): "TH13V",
    ("VF E34", "BASE"): "GK1DI",
}

def resolve_dms_version(dong_xe, phien_ban, raw_code=""):
    raw = (raw_code or "").strip().upper()
    if raw and len(raw) in [5, 6] and raw.isalnum():
        # Kiểm tra ngoại lệ: EC Van có cửa trượt mà bị gán nhầm TG11V
        norm_v = remove_diacritics(phien_ban)
        if "TRUOT" in norm_v or "SLIDING" in norm_v:
            return "TG12V"
        return raw

    dx = remove_diacritics(dong_xe)
    pb = remove_diacritics(phien_ban)

    # Normalize dòng xe
    m_norm = "VF 5"
    if "VF3" in dx or "VF 3" in dx: m_norm = "VF 3"
    elif "VF5" in dx or "VF 5" in dx: m_norm = "VF 5"
    elif "VF6" in dx or "VF 6" in dx: m_norm = "VF 6"
    elif "VF7" in dx or "VF 7" in dx: m_norm = "VF 7"
    elif "VF8" in dx or "VF 8" in dx: m_norm = "VF 8"
    elif "VF9" in dx or "VF 9" in dx: m_norm = "VF 9"
    elif "VAN" in dx: m_norm = "EC VAN"
    elif "LIMO" in dx: m_norm = "LIMO"
    elif "MINIO" in dx or "VF2" in dx: m_norm = "VF 2"
    elif "E34" in dx: m_norm = "VF E34"

    # Normalize phiên bản
    v_norm = "PLUS"
    if "TRUOT" in pb or "SLIDING" in pb: v_norm = "SLIDING"
    elif "ECO" in pb: v_norm = "ECO"
    elif "BASE" in pb or "TIEU CHUAN" in pb or "STD" in pb: v_norm = "BASE"
    elif "MPV" in pb or "7 CHO" in pb: v_norm = "MPV7"
    elif "LIMO" in pb: v_norm = "LIMO"
    elif "MINIO" in pb: v_norm = "MINIO"

    return DMS_VERSION_MAP.get((m_norm, v_norm)) or DMS_VERSION_MAP.get((m_norm, "PLUS")) or raw or ""

def run_dms_stock_radar_sync():
    """
    Quét trực tiếp VinFast DMS OData API kho xe và cập nhật lên Supabase.
    Tối ưu hóa chạy trên Vercel Serverless Function: multi-threading song song & kiểm tra cookie trước.
    """
    dealers = get_dealers_list()
    if not dealers:
        return {
            "success": False,
            "error": "Chưa có danh sách cấu hình đại lý VinFast DMS. Vui lòng mở trang VinFast DMS một lần trên trình duyệt để Extension cập nhật."
        }

    # Sắp xếp các dealer có cookie theo thời gian mới nhất lên đầu
    dealers_with_cookie = [d for d in dealers if d.get("cookie")]
    dealers_with_cookie.sort(key=lambda x: str(x.get("last_sync_time") or ""), reverse=True)

    if not dealers_with_cookie:
        return {
            "success": False,
            "error": "Chưa có Cookie DMS hoạt động. Vui lòng mở trang DMS VinFast một lần để tiện ích tự động lưu Cookie tập trung."
        }

    dms_base_url = "https://vinfastdms.crm5.dynamics.com"
    active_dealer = None
    active_cookie = None

    # Pre-flight check: thử lần lượt từng cookie từ mới nhất, dừng ngay khi tìm được cookie còn sống
    for d in dealers_with_cookie:
        c_test = d["cookie"]
        test_headers = {
            "Cookie": c_test,
            "Accept": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }
        try:
            test_url = f"{dms_base_url}/api/data/v9.2/xts_inventorynewvehicles?$select=xts_chassisnumber&$top=1"
            tr = requests.get(test_url, headers=test_headers, timeout=3.5, allow_redirects=False)
            if tr.status_code == 200 and "application/json" in tr.headers.get("Content-Type", ""):
                active_dealer = d
                active_cookie = c_test
                print(f"[DMS Stock Radar] Đã kết nối DMS thành công bằng tài khoản showroom: {d.get('dealer_code')}")
                break
        except Exception as e:
            print(f"[DMS Stock Radar] Kiểm tra cookie showroom {d.get('dealer_code')} lỗi: {e}")

    if not active_cookie or not active_dealer:
        return {
            "success": False,
            "error": "Cookie phiên làm việc VinFast DMS hiện tại đã hết hạn (hết hạn sau 24h). Vui lòng mở trang VinFast DMS trên trình duyệt một lần để làm mới Cookie!"
        }

    cookie = active_cookie
    dealer_code = active_dealer.get("dealer_code", "N31913")

    sb_url = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
    sb_key = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX"
    sb_headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json"
    }

    # 1. Tải danh sách xe kho thực tế từ Supabase
    try:
        kho_res = requests.get(
            f"{sb_url}/rest/v1/khoxe?select=id,vin,dong_xe,phien_ban,so_may,ma_dms,ma_phien_ban&trang_thai=not.is.null",
            headers=sb_headers,
            timeout=10
        )
        if kho_res.status_code != 200:
            return {"success": False, "error": f"Lỗi đọc khoxe Supabase: {kho_res.text[:200]}"}
        kho_cars = kho_res.json()
    except Exception as e:
        return {"success": False, "error": f"Lỗi kết nối Supabase: {str(e)}"}

    if not kho_cars:
        return {"success": True, "message": "Kho xe hiện đang trống.", "summary": {"total_stock": 0, "updated_count": 0, "gps_count": 0, "sold_removed": 0}, "cars": []}

    clean_vins = [c.get("vin", "").strip().upper() for c in kho_cars if c.get("vin")]
    car_by_vin = {c.get("vin", "").strip().upper(): c for c in kho_cars}

    # 2. Truy vấn OData API VinFast Dynamics song song qua ThreadPool
    dms_headers = {
        "Cookie": cookie,
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        "Prefer": 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
    }

    dms_records = []
    batch_size = 20

    def fetch_dms_batch(chunk_vins):
        filter_clause = " or ".join([f"xts_chassisnumber eq '{v}'" for v in chunk_vins])
        url = (
            f"{dms_base_url}/api/data/v9.2/xts_inventorynewvehicles?"
            f"$select=xts_chassisnumber,xts_enginenumber,_xts_siteid_value,_xts_lastvehicleorderid_value,"
            f"modifiedon,itv_lastlatitude,itv_lastlongitude,itv_lastlocationupdatetime,_xts_configurationid_value,xts_productdescription"
            f"&$filter={filter_clause}"
        )
        try:
            r = requests.get(url, headers=dms_headers, timeout=5, allow_redirects=False)
            if r.status_code == 200 and "application/json" in r.headers.get("Content-Type", ""):
                data = r.json()
                return data.get("value", [])
        except Exception as batch_err:
            print(f"[DMS Stock Radar] Batch exception: {batch_err}")
        return []

    chunks = [clean_vins[i:i + batch_size] for i in range(0, len(clean_vins), batch_size)]
    with ThreadPoolExecutor(max_workers=8) as executor:
        for batch_result in executor.map(fetch_dms_batch, chunks):
            if batch_result:
                dms_records.extend(batch_result)


    # Gom nhóm theo VIN
    dms_by_vin = {}
    for r in dms_records:
        v = (r.get("xts_chassisnumber") or "").strip().upper()
        if v:
            if v not in dms_by_vin: dms_by_vin[v] = []
            dms_by_vin[v].append(r)

    sold_vins = []
    update_list = []
    detailed_results = []
    gps_by_vin = {}

    for vin in clean_vins:
        recs = dms_by_vin.get(vin)
        car = car_by_vin.get(vin, {})
        dong_xe = car.get("dong_xe", "")
        phien_ban = car.get("phien_ban", "")

        if not recs:
            # Chưa có trên DMS
            continue

        # Check đã xuất hóa đơn
        if any(bool(it.get("_xts_lastvehicleorderid_value")) for it in recs):
            sold_vins.append(vin)
            detailed_results.append({
                "vin": vin,
                "dong_xe": dong_xe,
                "phien_ban": phien_ban,
                "ma_phien_ban": car.get("ma_phien_ban") or "(chưa rõ)",
                "so_may": car.get("so_may") or "(trống)",
                "ma_dms": car.get("ma_dms") or "(trống)",
                "has_gps": False,
                "lat": None,
                "lng": None,
                "status": "Đã xuất hóa đơn (Gỡ khỏi kho)"
            })
        else:
            # Sắp xếp mới nhất
            recs.sort(key=lambda x: x.get("modifiedon") or "", reverse=True)
            best = next((it for it in recs if it.get("xts_enginenumber")), recs[0])

            site_formatted = best.get("_xts_siteid_value@OData.Community.Display.V1.FormattedValue", "")
            site_id = best.get("_xts_siteid_value")
            dms_val = site_formatted.split(" ")[0] if site_formatted else (SITE_MAP.get(site_id) or "")
            eng_val = (best.get("xts_enginenumber") or "").strip()

            cfg_formatted = best.get("_xts_configurationid_value@OData.Community.Display.V1.FormattedValue", "") or best.get("xts_productdescription", "")
            pkg_val = resolve_dms_version(dong_xe, phien_ban, cfg_formatted or car.get("ma_phien_ban", ""))

            has_coords = bool(best.get("itv_lastlatitude") and best.get("itv_lastlongitude") and float(best.get("itv_lastlatitude")) != 0)

            if dms_val or eng_val or pkg_val or has_coords:
                item_payload = {
                    "vin": vin,
                    "ma_dms": dms_val or car.get("ma_dms") or None,
                    "so_may": eng_val or car.get("so_may") or None,
                    "ma_phien_ban": pkg_val or car.get("ma_phien_ban") or None
                }
                update_list.append(item_payload)

                # Dữ liệu hiển thị UI chi tiết
                detailed_results.append({
                    "vin": vin,
                    "dong_xe": dong_xe,
                    "phien_ban": phien_ban,
                    "ma_phien_ban": pkg_val or car.get("ma_phien_ban") or "(chưa rõ)",
                    "so_may": eng_val or car.get("so_may") or "(trống)",
                    "ma_dms": dms_val or car.get("ma_dms") or "(trống)",
                    "has_gps": has_coords,
                    "lat": float(best.get("itv_lastlatitude")) if has_coords else None,
                    "lng": float(best.get("itv_lastlongitude")) if has_coords else None,
                    "status": "Cập nhật thành công"
                })

        # Trích xuất GPS
        for r in recs:
            lat = r.get("itv_lastlatitude")
            lng = r.get("itv_lastlongitude")
            if lat and lng and float(lat) != 0 and float(lng) != 0:
                gps_by_vin[vin] = {
                    "vin": vin,
                    "lat": float(lat),
                    "lng": float(lng),
                    "speed": 0,
                    "heading": 0,
                    "captured_at": r.get("itv_lastlocationupdatetime") or datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }

    # 3. Đẩy cập nhật lên Supabase
    # 3.1 Gỡ xe XHĐ
    if sold_vins:
        try:
            requests.post(
                f"{sb_url}/rest/v1/rpc/rpc_auto_remove_sold_cars",
                headers=sb_headers,
                json={"p_sold_vins": sold_vins, "p_actor_name": f"DMS Serverless Radar ({dealer_code})"},
                timeout=15
            )
        except Exception as e:
            print(f"[DMS Stock Radar] Gỡ XHĐ error: {e}")

    # 3.2 Cập nhật mã DMS, Số máy và Mã phiên bản cho khoxe
    if update_list:
        try:
            requests.post(
                f"{sb_url}/rest/v1/rpc/rpc_sync_dms_metadata",
                headers=sb_headers,
                json={"p_cars": update_list},
                timeout=20
            )
        except Exception as e:
            print(f"[DMS Stock Radar] rpc_sync_dms_metadata error: {e}")


    # 3.3 Đẩy GPS lên car_telemetry
    gps_list = list(gps_by_vin.values())
    if gps_list:
        try:
            tel_headers = {**sb_headers, "Prefer": "resolution=merge-duplicates"}
            requests.post(
                f"{sb_url}/rest/v1/car_telemetry",
                headers=tel_headers,
                json=gps_list,
                timeout=20
            )
        except Exception as e:
            print(f"[DMS Stock Radar] GPS telemetry error: {e}")

    return {
        "success": True,
        "message": f"Đã quét và đồng bộ thành công {len(update_list)} xe từ VinFast DMS!",
        "summary": {
            "total_stock": len(kho_cars),
            "updated_count": len(update_list),
            "gps_count": len(gps_list),
            "sold_removed": len(sold_vins),
            "dealer": dealer_code,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        "cars": detailed_results
    }
