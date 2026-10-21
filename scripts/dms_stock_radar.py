# -*- coding: utf-8 -*-
"""
Module: dms_stock_radar.py
Mục đích: Đồng bộ trực tiếp Kho xe, Số máy, Mã DMS, Mã Phiên Bản & GPS Live 
kết hợp Đơn Hàng Mở (donhanghienhuu) từ VinFast Dynamics OData API lên Supabase Cloud.
Hỗ trợ chạy trên Vercel Serverless Function (Python) và Máy trạm văn phòng.
"""

import os
import json
import requests
from datetime import datetime, timezone, timedelta
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

# Bảng mã chuẩn DMS cho từng dòng xe
DMS_VERSION_MAP = {
    ("VF 3", "PLUS"): "TI1BV",
    ("VF 5", "PLUS"): "GA1RV",
    ("VF 6", "ECO"): "JB10V",
    ("VF 6", "PLUS"): "JB11V",
    ("VF 7", "ECO"): "HC1CV",
    ("VF 7", "PLUS"): "HC1AV",
    ("VF 8", "ECO"): "EF10V",
    ("VF 8", "PLUS"): "EF11V",
    ("VF 9", "ECO"): "TG12V",
    ("VF 9", "PLUS"): "TG13V",
    ("LIMO", "LIMO"): "SL1WV",
    ("VF LIMO", "LIMO"): "SL1WV",
    ("MINIO", "MINIO"): "TB11V",
    ("VF MINIO", "MINIO"): "TB11V",
    ("EC VAN", "PLUS"): "VL1PV",
    ("EC VAN", "SLIDING"): "VL1SV",
    ("VF EC VAN", "PLUS"): "VL1PV",
    ("VF EC VAN", "SLIDING"): "VL1SV"
}

def extract_dms_package_code(raw, dong_xe="", phien_ban=""):
    """Trích xuất mã phiên bản DMS chuẩn."""
    if raw:
        r_upper = raw.upper()
        for code in ["TI1BV", "GA1RV", "JB10V", "JB11V", "HC1CV", "HC1AV", "EF10V", "EF11V", "TG12V", "TG13V", "SL1WV", "TB11V", "VL1PV", "VL1SV"]:
            if code in r_upper:
                return code

    dx = remove_diacritics(dong_xe)
    pb = remove_diacritics(phien_ban)

    m_norm = "VF 5"
    if "VF 3" in dx or "VF3" in dx: m_norm = "VF 3"
    elif "VF 5" in dx or "VF5" in dx: m_norm = "VF 5"
    elif "VF 6" in dx or "VF6" in dx: m_norm = "VF 6"
    elif "VF 7" in dx or "VF7" in dx: m_norm = "VF 7"
    elif "VF 8" in dx or "VF8" in dx: m_norm = "VF 8"
    elif "VF 9" in dx or "VF9" in dx: m_norm = "VF 9"
    elif "LIMO" in dx: m_norm = "LIMO"
    elif "MINIO" in dx: m_norm = "MINIO"
    elif "EC VAN" in dx or "ECVAN" in dx or "VAN" in dx: m_norm = "EC VAN"

    v_norm = "PLUS"
    if "TRUOT" in pb or "SLIDING" in pb: v_norm = "SLIDING"
    elif "ECO" in pb: v_norm = "ECO"
    elif "BASE" in pb or "TIEU CHUAN" in pb or "STD" in pb: v_norm = "BASE"
    elif "MPV" in pb or "7 CHO" in pb: v_norm = "MPV7"
    elif "LIMO" in pb: v_norm = "LIMO"
    elif "MINIO" in pb: v_norm = "MINIO"

    return DMS_VERSION_MAP.get((m_norm, v_norm)) or DMS_VERSION_MAP.get((m_norm, "PLUS")) or raw or ""

def get_lookup_name(item, field):
    if not item: return ""
    f = field.lower()
    for k, v in item.items():
        kl = k.lower()
        if f in kl and "@odata.community.display.v1.formattedvalue" in kl:
            return str(v) if v is not None else ""
    for k, v in item.items():
        kl = k.lower()
        if f in kl and "_value" in kl:
            return str(v) if v is not None else ""
    val = item.get(field, "")
    return str(val) if val is not None else ""

def is_open_order(item):
    """Chỉ chấp nhận các đơn hàng thực sự MỞ (Chưa xuất hóa đơn, chưa hủy)"""
    if item.get("xvf_sapinvoicenumber") or item.get("xvf_sapinvoicedate") or item.get("xts_salesdate"):
        return False
    if item.get("xts_status") in [7, 10, "7", "10"]:
        return False
    st = str(get_lookup_name(item, "xts_status") or "").lower()
    for blocked in ["hóa đơn", "invoiced", "hủy", "cancel", "void", "closed", "đã giao", "hoàn tất"]:
        if blocked in st:
            return False
    return True

def sync_dms_orders_to_donhanghienhuu(valid_dealers, sb_url, sb_headers):
    """
    Quét danh sách đơn hàng MỞ từ TẤT CẢ các đại lý VinFast DMS có cookie hợp lệ
    và tổng hợp đẩy vào bảng donhanghienhuu trên Supabase.
    """
    dms_base_url = "https://vinfastdms.crm5.dynamics.com"
    all_orders = []
    seen_so = set()
    dealers_summary = []

    for d in valid_dealers:
        d_code = d.get("dealer_code", "DMS")
        cookie = d.get("cookie")
        if not cookie:
            continue

        headers = {
            "Cookie": cookie,
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Prefer": 'odata.include-annotations="OData.Community.Display.V1.FormattedValue", odata.maxpagesize=500'
        }

        query_url = f"{dms_base_url}/api/data/v9.2/xts_newvehiclesalesorders?$filter=statecode eq 0"
        d_order_count = 0

        try:
            pages = 0
            while query_url and pages < 4:
                pages += 1
                res = requests.get(query_url, headers=headers, timeout=15)
                if res.status_code != 200:
                    break
                data = res.json()
                items = data.get("value", [])
                for it in items:
                    if is_open_order(it):
                        so_dh = it.get("xts_newvehiclesalesordernumber", "")
                        if so_dh and so_dh not in seen_so:
                            seen_so.add(so_dh)
                            all_orders.append(it)
                            d_order_count += 1
                query_url = data.get("@odata.nextLink")
            print(f"[DMS Orders] 🏢 [{d_code}] Quét được {d_order_count} đơn hàng MỞ mới.")
            dealers_summary.append(f"{d_code} ({d_order_count})")
        except Exception as e:
            print(f"[DMS Orders] Lỗi tải đơn hàng đại lý [{d_code}]: {e}")

    if not all_orders:
        return 0, []

    # Map dữ liệu sang cấu trúc Supabase bảng donhanghienhuu
    mapped_orders = []
    for item in all_orders:
        so_dh = item.get("xts_newvehiclesalesordernumber", "")
        mapped_orders.append({
            "new_vehicle_sales_order_id": item.get("xts_newvehiclesalesorderid", ""),
            "kiem_tra_tong_cho_hang": "",
            "ngay_sua_doi": item.get("modifiedon"),
            "ngay_giao_dich": item.get("xts_transactiondate")[:10] if item.get("xts_transactiondate") else None,
            "tu_van_ban_hang": get_lookup_name(item, "xts_salespersonid") or get_lookup_name(item, "ownerid") or "",
            "so_don_hang_ban": so_dh,
            "so_bao_gia_xe": get_lookup_name(item, "xts_newvehiclesalesquoteid") or "",
            "ngay_xuat_hoa_don": None,
            "khach_hang_tiem_nang": get_lookup_name(item, "xts_potentialcustomerid") or item.get("xts_potentialcustomerdescription", ""),
            "promotion": get_lookup_name(item, "xvf_promotionid") or item.get("itv_promotiondetail", ""),
            "ma_khach_hang": item.get("xts_customernumber", ""),
            "mo_ta_san_pham": item.get("xts_productdescription", "") or get_lookup_name(item, "xts_productid") or "",
            "ten_phien_ban": get_lookup_name(item, "xvf_characteristicconfiguration") or get_lookup_name(item, "xts_productconfigurationid") or "",
            "loai_tran": get_lookup_name(item, "itv_characteristicceilingid") or "",
            "mau_ngoai_that": item.get("xvf_exteriorcolor") or get_lookup_name(item, "xts_productexteriorcolorid") or "",
            "mau_noi_that": item.get("xvf_interiorcolor") or get_lookup_name(item, "xts_productinteriorcolorid") or "",
            "ma_phien_ban": get_lookup_name(item, "xvf_vehiclepackage") or "",
            "ma_mau_ngoai_that": get_lookup_name(item, "xts_productexteriorcolorid") or "",
            "ma_mau_noi_that": get_lookup_name(item, "xts_productinteriorcolorid") or "",
            "trang_thai": get_lookup_name(item, "xts_status") or "Mở",
            "pre_customer": get_lookup_name(item, "itv_customerpreorderid") or get_lookup_name(item, "itv_leadid") or "",
            "so_vin": get_lookup_name(item, "xts_chassisid") or item.get("xts_chassisnumber") or "",
            "accessory_serial": get_lookup_name(item, "xts_stockid") or "",
            "ma_san_pham": get_lookup_name(item, "xts_productid") or "",
            "so_ton_kho": get_lookup_name(item, "xts_stockid") or "",
            "so_tien_thuc_sau_thue": item.get("xts_netamountaftertax") or item.get("xvf_grandtotal") or 0,
            "don_hang_goc": get_lookup_name(item, "xts_originalnewvehiclesalesorderreferenceid") or "",
            "chi_nhanh": get_lookup_name(item, "xts_businessunitid") or ""
        })

    # Dọn dẹp các đơn đã xuất hóa đơn hoặc đã hủy còn nằm trong donhanghienhuu
    try:
        prune_url = f"{sb_url}/rest/v1/donhanghienhuu?or=(ngay_xuat_hoa_don.not.is.null,trang_thai.ilike.*hóa đơn*,trang_thai.ilike.*invoiced*,trang_thai.ilike.*hủy*,trang_thai.ilike.*cancel*)"
        requests.delete(prune_url, headers=sb_headers, timeout=15)
    except Exception as e:
        print(f"[DMS Orders] Dọn dẹp đơn cũ: {e}")

    # Đẩy bulk lên donhanghienhuu
    try:
        orders_url = f"{sb_url}/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban"
        headers_upsert = {**sb_headers, "Prefer": "resolution=merge-duplicates, return=minimal"}
        CHUNK_SIZE = 100
        for i in range(0, len(mapped_orders), CHUNK_SIZE):
            chunk = mapped_orders[i:i+CHUNK_SIZE]
            requests.post(orders_url, headers=headers_upsert, json=chunk, timeout=20)
        print(f"[DMS Orders] ✅ Đã đồng bộ {len(mapped_orders)} đơn hàng MỞ từ {len(valid_dealers)} đại lý vào bảng donhanghienhuu!")
    except Exception as e:
        print(f"[DMS Orders] Lỗi upsert donhanghienhuu: {e}")

    return len(mapped_orders), dealers_summary

def is_daytime_working_hours():
    """Kiểm tra thời điểm hiện tại có trong giờ hành chính Việt Nam (07:30 - 18:30 GMT+7)."""
    vn_time = datetime.now(timezone(timedelta(hours=7)))
    hour_float = vn_time.hour + vn_time.minute / 60.0
    return 7.5 <= hour_float <= 18.5

# Bộ nhớ đệm On-Demand (Smart Cache TTL = 15 phút)
_dms_radar_cache = {"data": None, "timestamp": 0}

def run_dms_stock_radar_sync(include_orders=False, force=False):
    """
    Quét trực tiếp VinFast DMS OData API kho xe và cập nhật lên Supabase.
    Chế độ On-Demand: Nếu đã có dữ liệu quét trong vòng 15 phút và force=False,
    trả về ngay từ bộ nhớ đệm (0 giây) để tiết kiệm tài nguyên.
    """
    import time
    now_ts = time.time()

    # Kiểm tra cache hợp lệ
    if not force and _dms_radar_cache["data"] and (now_ts - _dms_radar_cache["timestamp"] < 900):
        cached_result = dict(_dms_radar_cache["data"])
        cached_result["cached"] = True
        cached_result["message"] = f"[Dữ liệu sẵn sàng] " + cached_result.get("message", "")
        return cached_result

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

    # Pre-flight check: kiểm tra tất cả các cookie và gom danh sách các đại lý còn hoạt động
    valid_dealers = []
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
                valid_dealers.append(d)
                print(f"[DMS Stock Radar] 🟢 Showroom {d.get('dealer_code')} cookie HỢP LỆ")
        except Exception as e:
            print(f"[DMS Stock Radar] Kiểm tra cookie showroom {d.get('dealer_code')} lỗi: {e}")

    if not valid_dealers:
        return {
            "success": False,
            "error": "Tất cả Cookie phiên làm việc VinFast DMS hiện tại đã hết hạn (hết hạn sau 24h). Vui lòng mở trang VinFast DMS trên trình duyệt một lần để làm mới Cookie!"
        }

    # Ưu tiên đại lý Thuận An N31913 làm primary dealer nếu có, hoặc lấy đại lý đầu tiên
    thuan_an = next((d for d in valid_dealers if d.get("dealer_code") == "N31913"), None)
    active_dealer = thuan_an or valid_dealers[0]
    cookie = active_dealer["cookie"]
    dealer_code = active_dealer.get("dealer_code", "N31913")
    active_codes_str = ", ".join([d.get("dealer_code", "") for d in valid_dealers])
    print(f"[DMS Stock Radar] 🚀 Sử dụng {len(valid_dealers)} showroom có cookie: {active_codes_str}")

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
    batch_size = 35
    session = requests.Session()
    session.headers.update(dms_headers)

    def fetch_dms_batch(chunk_vins):
        filter_clause = " or ".join([f"xts_chassisnumber eq '{v}'" for v in chunk_vins])
        url = (
            f"{dms_base_url}/api/data/v9.2/xts_inventorynewvehicles?"
            f"$select=xts_chassisnumber,xts_enginenumber,_xts_siteid_value,_xts_lastvehicleorderid_value,"
            f"modifiedon,itv_lastlatitude,itv_lastlongitude,itv_lastlocationupdatetime,_xts_configurationid_value,xts_productdescription"
            f"&$filter={filter_clause}"
        )
        try:
            r = session.get(url, timeout=5, allow_redirects=False)
            if r.status_code == 200 and "application/json" in r.headers.get("Content-Type", ""):
                data = r.json()
                return data.get("value", [])
        except Exception as batch_err:
            print(f"[DMS Stock Radar] Batch error: {batch_err}")
            return []

    vin_chunks = [clean_vins[i:i + batch_size] for i in range(0, len(clean_vins), batch_size)]

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(fetch_dms_batch, chunk) for chunk in vin_chunks]
        for f in futures:
            try:
                res_batch = f.result()
                if res_batch:
                    dms_records.extend(res_batch)
            except Exception as e:
                print(f"[DMS Stock Radar] ThreadPool batch failure: {e}")

    dms_by_vin = {}
    for r in dms_records:
        chassis = (r.get("xts_chassisnumber") or "").strip().upper()
        if chassis:
            if chassis not in dms_by_vin:
                dms_by_vin[chassis] = []
            dms_by_vin[chassis].append(r)

    # 3. So khớp thông tin
    update_list = []
    sold_vins = []
    gps_by_vin = {}
    detailed_results = []

    for car in kho_cars:
        vin = (car.get("vin") or "").strip().upper()
        if not vin:
            continue

        dong_xe = car.get("dong_xe") or ""
        phien_ban = car.get("phien_ban") or ""

        recs = dms_by_vin.get(vin, [])

        if not recs:
            detailed_results.append({
                "vin": vin,
                "dong_xe": dong_xe,
                "phien_ban": phien_ban,
                "ma_phien_ban": car.get("ma_phien_ban") or "(chưa rõ)",
                "so_may": car.get("so_may") or "(trống)",
                "ma_dms": car.get("ma_dms") or "(trống)",
                "has_gps": False,
                "status": "Không tìm thấy trên DMS"
            })
            continue

        best = max(recs, key=lambda x: str(x.get("modifiedon") or ""))
        last_order = best.get("_xts_lastvehicleorderid_value")
        if last_order:
            sold_vins.append(vin)
            detailed_results.append({
                "vin": vin,
                "dong_xe": dong_xe,
                "phien_ban": phien_ban,
                "ma_phien_ban": car.get("ma_phien_ban") or "(chưa rõ)",
                "so_may": best.get("xts_enginenumber") or car.get("so_may") or "(trống)",
                "ma_dms": car.get("ma_dms") or "(trống)",
                "has_gps": False,
                "status": "Đã xuất hóa đơn (Gỡ khỏi kho)"
            })
        else:
            eng_val = (best.get("xts_enginenumber") or "").strip()
            site_guid = (best.get("_xts_siteid_value") or "").strip().lower()
            dms_val = SITE_MAP.get(site_guid, "")
            prod_desc = best.get("xts_productdescription") or ""
            pkg_val = extract_dms_package_code(prod_desc, dong_xe, phien_ban)

            if eng_val or dms_val or pkg_val:
                has_coords = bool(best.get("itv_lastlatitude") and best.get("itv_lastlongitude"))
                item_payload = {
                    "vin": vin,
                    "so_may": eng_val or None,
                    "ma_dms": dms_val or None,
                    "ma_phien_ban": pkg_val or None
                }
                update_list.append(item_payload)

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

    # 4. Đẩy cập nhật lên Supabase
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

    # 5. ĐỒNG BỘ ĐƠN HÀNG HIỆN HỮU TỪ TẤT CẢ SHOWROOM (Nếu include_orders=True)
    orders_synced = 0
    dealers_summary = []
    if include_orders:
        try:
            print(f"[DMS Stock Radar] 📋 Bắt đầu đồng bộ bảng donhanghienhuu từ {len(valid_dealers)} đại lý...")
            orders_synced, dealers_summary = sync_dms_orders_to_donhanghienhuu(valid_dealers, sb_url, sb_headers)
        except Exception as e:
            print(f"[DMS Stock Radar] Lỗi đồng bộ donhanghienhuu: {e}")

    dealers_label = f"{len(valid_dealers)} Showroom ({active_codes_str})"
    final_result = {
        "success": True,
        "message": f"Đã quét và đồng bộ thành công {len(update_list)} xe kho" + (f" & {orders_synced} đơn hàng MỞ từ {dealers_label} vào donhanghienhuu!" if include_orders else "!"),
        "summary": {
            "total_stock": len(kho_cars),
            "updated_count": len(update_list),
            "gps_count": len(gps_list),
            "sold_removed": len(sold_vins),
            "orders_count": orders_synced,
            "dealer": dealers_label,
            "active_dealers": [d.get("dealer_code") for d in valid_dealers],
            "dealers_summary": dealers_summary,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        "cars": detailed_results,
        "orders_count": orders_synced
    }

    # Lưu cache bộ nhớ đệm
    _dms_radar_cache["data"] = final_result
    _dms_radar_cache["timestamp"] = time.time()

    return final_result

if __name__ == '__main__':
    force_sync = "--force" in sys.argv or "-f" in sys.argv
    skip_orders = "--no-orders" in sys.argv
    res = run_dms_stock_radar_sync(include_orders=not skip_orders, force=force_sync)
    print(json.dumps(res, default=str, ensure_ascii=False))
