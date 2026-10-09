import os
import sys
import json
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ===== CẤU HÌNH HỆ THỐNG =====
DMS_BASE_URL = "https://vinfastdms.crm5.dynamics.com"
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"

# Mapping mã site DMS sang mã DMS showroom
DMS_SITE_MAP = {
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

# Đọc các thông số bí mật từ biến môi trường (.env hoặc secrets cấu hình trên Cloud)
DMS_USERNAME = os.environ.get("DMS_USERNAME")
DMS_PASSWORD = os.environ.get("DMS_PASSWORD")
DMS_SESSION_COOKIE = os.environ.get("DMS_SESSION_COOKIE")
DMS_BEARER_TOKEN = os.environ.get("DMS_BEARER_TOKEN")

SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY", os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", ""))

SUPABASE_HEADERS = {
    "apikey": SUPABASE_API_KEY,
    "Authorization": f"Bearer {SUPABASE_API_KEY}",
    "Content-Type": "application/json",
}

# ===== HÀM XÁC THỰC MICROSOFT DYNAMICS 365 =====
def get_dms_headers():
    """Tự động xác thực lấy Header kết nối phù hợp."""
    # Cách 1: Sử dụng Bearer Token thủ công nếu được cấu hình sẵn
    if DMS_BEARER_TOKEN:
        print("🔑 Sử dụng Bearer Token thủ công cấu hình từ trước...")
        return {
            "Authorization": f"Bearer {DMS_BEARER_TOKEN}",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }

    # Cách 2: Sử dụng Session Cookie từ biến môi trường hoặc dms_dealers_config.json
    cookie = DMS_SESSION_COOKIE
    if not cookie:
        try:
            config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    dealers = json.load(f)
                    # Ưu tiên đại lý Thuận An N31913 hoặc đại lý có cookie hợp lệ
                    target = next((x for x in dealers if x.get("dealer_code") == "N31913" and x.get("cookie")), None)
                    if target:
                        cookie = target.get("cookie")
                    else:
                        for d in dealers:
                            if d.get("cookie"):
                                cookie = d["cookie"]
                                break
        except Exception:
            pass

    if cookie:
        print("🍪 Sử dụng Session Cookie lấy từ cấu hình DMS (Thuận An N31913)...")
        return {
            "Cookie": cookie,
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }

    # Cách 3: Tự động lấy Access Token thông qua OAuth 2.0 (ROPC Flow) nếu có username/password
    if DMS_USERNAME and DMS_PASSWORD:
        print(f"🤖 Đang tự động xác thực OAuth với tài khoản Microsoft: {DMS_USERNAME}...")
        token_url = "https://login.microsoftonline.com/common/oauth2/token"
        payload = {
            "grant_type": "password",
            "username": DMS_USERNAME,
            "password": DMS_PASSWORD,
            "resource": DMS_BASE_URL,
            "client_id": "515da1b0-da2e-4b2a-b0b2-3bd23b578e56" # Dynamics CRM Public Client ID
        }
        try:
            res = requests.post(token_url, data=payload, timeout=20)
            if res.status_code == 200:
                token_data = res.json()
                access_token = token_data.get("access_token")
                print("   ✅ Xác thực Microsoft thành công! Đã lấy Access Token mới.")
                return {
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "Content-Type": "application/json; charset=utf-8",
                    "OData-MaxVersion": "4.0",
                    "OData-Version": "4.0"
                }
            else:
                print(f"   ❌ Không thể đăng nhập qua OAuth: {res.text[:300]}")
        except Exception as e:
            print(f"   ❌ Lỗi kết nối server xác thực: {e}")

    print("⚠️ Thiếu cấu hình thông tin đăng nhập! Không thể kết nối DMS.")
    return None

# ===== BƯỚC 1: ĐỒNG BỘ GPS TELEMETRY (Cập nhật mỗi 30 phút) =====
def sync_gps_live(dms_headers):
    print("\n📍 --- BƯỚC 1: QUÉT GPS LIVE & TELEMETRY ---")
    
    # 1. Lấy danh sách xe trong kho từ Supabase khoxe
    try:
        url = f"{SUPABASE_URL}/rest/v1/khoxe?select=vin,dong_xe,trang_thai,nguoi_giu_xe"
        res = requests.get(url, headers=SUPABASE_HEADERS, timeout=20)
        if res.status_code != 200:
            print(f"❌ Không lấy được danh sách khoxe từ Supabase: {res.text}")
            return
        khoxe_list = res.json()
    except Exception as e:
        print(f"❌ Lỗi truy vấn khoxe: {e}")
        return

    vins = [item["vin"].strip().upper() for item in khoxe_list if item.get("vin") and len(item["vin"].strip()) == 17]
    if not vins:
        print("⚠️ Không tìm thấy số VIN hợp lệ nào trong kho xe.")
        return

    vin_set = set(vins)
    print(f"🎯 Tìm thấy {len(vins)} xe trong kho Supabase.")

    # 2. Truy vấn trực tiếp các cột GPS, Số máy & Mã DMS từ bảng kho xe xts_inventorynewvehicles của DMS
    print("📡 Đang lấy tọa độ GPS, Số máy & Mã DMS từ bảng kho xe xts_inventorynewvehicles của DMS...")
    gps_results = []
    metadata_by_vin = {}
    inv_url = f"{DMS_BASE_URL}/api/data/v9.2/xts_inventorynewvehicles?$select=xts_chassisnumber,xts_enginenumber,_xts_siteid_value,itv_lastlatitude,itv_lastlongitude,itv_lastlocationupdatetime"
    
    try:
        while inv_url:
            res = requests.get(inv_url, headers=dms_headers, timeout=40)
            if res.status_code != 200:
                print(f"⚠️ Không truy vấn được kho xe: {res.text[:200]}")
                break
            data = res.json()
            for item in data.get("value", []):
                vin = (item.get("xts_chassisnumber") or "").strip().upper()
                if not vin or vin not in vin_set:
                    continue

                # Trích xuất số máy và mã DMS showroom
                sm = (item.get("xts_enginenumber") or "").strip()
                site_id = item.get("_xts_siteid_value")
                dms_code = DMS_SITE_MAP.get(site_id, "")
                if sm or dms_code:
                    metadata_by_vin[vin] = {
                        "vin": vin,
                        "so_may": sm,
                        "ma_dms": dms_code
                    }

                lat = item.get("itv_lastlatitude")
                lng = item.get("itv_lastlongitude")
                t_val = item.get("itv_lastlocationupdatetime") or datetime.now(timezone.utc).isoformat()
                if lat and lng and float(lat) != 0 and float(lng) != 0:
                    gps_results.append({
                        "vin": vin,
                        "lat": float(lat),
                        "lng": float(lng),
                        "speed": 0,
                        "heading": 0,
                        "captured_at": t_val,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
            if len(gps_results) >= len(vin_set) and len(metadata_by_vin) >= len(vin_set):
                break
            inv_url = data.get("@odata.nextLink")
        print(f"   ✅ Đã trích xuất {len(gps_results)} xe trong kho có tọa độ GPS từ DMS!")
    except Exception as e:
        print(f"❌ Lỗi truy vấn tọa độ kho xe: {e}")
        return

    # Cập nhật số máy và mã DMS cho khoxe
    if metadata_by_vin:
        try:
            rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/rpc_sync_dms_metadata"
            rpc_res = requests.post(rpc_url, headers=SUPABASE_HEADERS, json={"p_cars": list(metadata_by_vin.values())}, timeout=30)
            if rpc_res.status_code in [200, 204]:
                print(f"   ✅ Đã chuẩn hóa Số máy & Mã DMS cho {len(metadata_by_vin)} xe trong kho!")
        except Exception as e:
            print(f"⚠️ Lỗi cập nhật metadata kho xe: {e}")

    if not gps_results:
        print("⚠️ Không có tọa độ GPS mới nào được phản hồi thành công từ VinFast.")
        return

    # 3. Đẩy dữ liệu tọa độ lên bảng car_telemetry trên Supabase (khử trùng VIN trước khi upsert)
    try:
        unique_gps = {}
        for r in gps_results:
            unique_gps[r["vin"]] = r
        final_gps = list(unique_gps.values())

        telemetry_url = f"{SUPABASE_URL}/rest/v1/car_telemetry"
        headers_with_upsert = {**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates"}
        
        CHUNK_SIZE = 200
        success_count = 0
        for i in range(0, len(final_gps), CHUNK_SIZE):
            chunk = final_gps[i:i+CHUNK_SIZE]
            res = requests.post(telemetry_url, headers=headers_with_upsert, json=chunk, timeout=30)
            if res.status_code in [200, 201, 204]:
                success_count += len(chunk)
            else:
                print(f"❌ Lỗi ghi nhận cụm {i//CHUNK_SIZE + 1} car_telemetry: {res.text}")

        print(f"🎉 Đồng bộ thành công {success_count}/{len(final_gps)} vị trí GPS xe lên car_telemetry!")
    except Exception as e:
        print(f"❌ Lỗi đẩy telemetry: {e}")

# ===== BƯỚC 2: ĐỒNG BỘ ĐƠN HÀNG (Cập nhật mỗi 4 tiếng) =====
def get_lookup_name(item, field):
    if not item: return ""
    f = field.lower()
    for k, v in item.items():
        kl = k.lower()
        if f in kl and "@odata.community.display.v1.formattedvalue" in kl:
            return v
    for k, v in item.items():
        kl = k.lower()
        if f in kl and "_value" in kl:
            return v
    return item.get(field, "")

def sync_orders(dms_headers):
    print("\n📋 --- BƯỚC 2: ĐỒNG BỘ ĐƠN HÀNG HIỆN HỮU ---")
    
    # 1. Tải tất cả các đơn hàng từ API OData DMS
    all_orders = []
    query_url = f"{DMS_BASE_URL}/api/data/v9.2/xts_newvehiclesalesorders?$filter=statecode eq 0"
    
    print("📥 Đang tải đơn hàng mở từ Dynamics OData API...")
    try:
        while query_url:
            res = requests.get(query_url, headers=dms_headers, timeout=30)
            if res.status_code != 200:
                print(f"❌ Lỗi tải đơn hàng DMS: {res.text[:300]}")
                return
            data = res.json()
            all_orders.extend(data.get("value", []))
            query_url = data.get("@odata.nextLink")
    except Exception as e:
        print(f"❌ Lỗi kết nối Dynamics: {e}")
        return

    print(f"   📊 Nhận được {len(all_orders)} đơn hàng từ DMS. Đang xử lý chuẩn hóa...")

    # 2. Map dữ liệu sang cấu trúc Supabase bảng donhanghienhuu
    mapped_data = []
    for item in all_orders:
        mapped_data.append({
            "new_vehicle_sales_order_id": item.get("xts_newvehiclesalesorderid", ""),
            "kiem_tra_tong_cho_hang": "",
            "ngay_sua_doi": item.get("modifiedon"),
            "ngay_giao_dich": item.get("xts_transactiondate")[:10] if item.get("xts_transactiondate") else None,
            "tu_van_ban_hang": get_lookup_name(item, "xts_salespersonid") or get_lookup_name(item, "ownerid") or "",
            "so_don_hang_ban": item.get("xts_newvehiclesalesordernumber", ""),
            "so_bao_gia_xe": get_lookup_name(item, "xts_newvehiclesalesquoteid") or "",
            "ngay_xuat_hoa_don": item.get("xvf_sapinvoicedate")[:10] if item.get("xvf_sapinvoicedate") else (item.get("xts_salesdate")[:10] if item.get("xts_salesdate") else (item.get("xts_deliverydate")[:10] if item.get("xts_deliverydate") else None)),
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
            "trang_thai": get_lookup_name(item, "xts_status") or "",
            "pre_customer": get_lookup_name(item, "itv_customerpreorderid") or get_lookup_name(item, "itv_leadid") or "",
            "so_vin": get_lookup_name(item, "xts_chassisid") or item.get("xts_chassisnumber") or "",
            "accessory_serial": get_lookup_name(item, "xts_stockid") or "",
            "ma_san_pham": get_lookup_name(item, "xts_productid") or "",
            "so_ton_kho": get_lookup_name(item, "xts_stockid") or "",
            "so_tien_thuc_sau_thue": item.get("xts_netamountaftertax") or item.get("xvf_grandtotal") or 0,
            "don_hang_goc": get_lookup_name(item, "xts_originalnewvehiclesalesorderreferenceid") or "",
            "chi_nhanh": get_lookup_name(item, "xts_businessunitid") or ""
        })

    # Lọc trùng lặp dựa trên so_don_hang_ban mới nhất
    unique_orders = {}
    for ord in mapped_data:
        so_dh = ord["so_don_hang_ban"]
        if so_dh:
            unique_orders[so_dh] = ord

    final_orders = list(unique_orders.values())
    if not final_orders:
        print("⚠️ Không có dữ liệu đơn hàng hợp lệ để đồng bộ.")
        return

    # 3. Đẩy dữ liệu lên donhanghienhuu qua REST Bulk POST
    try:
        orders_url = f"{SUPABASE_URL}/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban"
        headers_with_upsert = {**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates, return=minimal"}
        
        # Gửi theo cụm 200 bản ghi để tránh quá tải
        CHUNK_SIZE = 200
        for i in range(0, len(final_orders), CHUNK_SIZE):
            chunk = final_orders[i:i+CHUNK_SIZE]
            res = requests.post(orders_url, headers=headers_with_upsert, json=chunk, timeout=30)
            if res.status_code in [200, 201, 204]:
                print(f"   ✅ Đã đẩy cụm đơn hàng {i//CHUNK_SIZE + 1}: {len(chunk)} bản ghi OK.")
            else:
                print(f"   ❌ Lỗi đẩy cụm đơn hàng: {res.text}")
    except Exception as e:
        print(f"❌ Lỗi kết nối Supabase đơn hàng: {e}")

# ===== BƯỚC 3: ĐỒNG BỘ KHO XE (Cập nhật mỗi 4 tiếng) =====
def sync_inventory(dms_headers):
    print("\n🏢 --- BƯỚC 3: ĐỒNG BỘ KHO XE CHƯA BÁN ---")
    
    # 1. Tải tất cả các bản ghi tồn kho
    all_inv = []
    query_url = f"{DMS_BASE_URL}/api/data/v9.2/xts_inventorynewvehicles"
    
    print("📥 Đang tải kho xe từ Dynamics OData API...")
    try:
        while query_url:
            res = requests.get(query_url, headers=dms_headers, timeout=30)
            if res.status_code != 200:
                print(f"❌ Lỗi tải kho xe DMS: {res.text[:300]}")
                return
            data = res.json()
            all_inv.extend(data.get("value", []))
            query_url = data.get("@odata.nextLink")
    except Exception as e:
        print(f"❌ Lỗi kết nối Dynamics: {e}")
        return

    print(f"   📊 Nhận được {len(all_inv)} bản ghi kho xe từ DMS. Đang lọc xe chưa bán...")

    # Lọc bỏ các xe đã gán số đơn hàng bán (đã bán)
    sold_vins = set(item.get("xts_chassisnumber", "").strip().upper() for item in all_inv if item.get("_xts_lastvehicleorderid_value"))
    
    # 2. Map dữ liệu sang cấu trúc Supabase bảng thongtinxe
    mapped_data = []
    for item in all_inv:
        vin = item.get("xts_chassisnumber", "").strip().upper()
        if vin and len(vin) == 17 and vin not in sold_vins:
            mapped_data.append({
                "vin": vin,
                "so_may": item.get("xts_enginenumber", "") or "",
                "mo_ta": item.get("xts_productdescription", "") or "",
                "khu_vuc": get_lookup_name(item, "xts_siteid") or "",
                "phien_ban": get_lookup_name(item, "xts_configurationid") or "",
                "ngoai_that": get_lookup_name(item, "xts_vehicleexteriorcolorid") or "",
                "noi_that": get_lookup_name(item, "xts_vehicleinteriorcolorid") or "",
                "nam_san_xuat": int(item.get("xts_productionyear")) if item.get("xts_productionyear") else None,
                "inventory_id": "", "check_sum": "", "so_ton_kho": "", "so_tham_chieu": "", "ma_san_pham": "", "so_don_hang_cuoi": ""
            })

    unique_inv = {}
    for inv in mapped_data:
        unique_inv[inv["vin"]] = inv

    final_inv = list(unique_inv.values())
    if not final_inv:
        print("⚠️ Không có xe trống nào chưa bán để đồng bộ.")
        return

    # 3. Đẩy lên thongtinxe qua RPC rpc_sync_thongtinxe (hoặc fallback REST Bulk POST)
    try:
        rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/rpc_sync_thongtinxe"
        CHUNK_SIZE = 500
        for i in range(0, len(final_inv), CHUNK_SIZE):
            chunk = final_inv[i:i+CHUNK_SIZE]
            rpc_res = requests.post(rpc_url, headers=SUPABASE_HEADERS, json={"p_cars": chunk}, timeout=30)
            if rpc_res.status_code in [200, 204]:
                print(f"   ✅ Đã nạp cụm kho xe qua RPC {i//CHUNK_SIZE + 1}: {len(chunk)} xe OK.")
            else:
                # Fallback qua REST table
                inv_url = f"{SUPABASE_URL}/rest/v1/thongtinxe?on_conflict=vin"
                headers_with_upsert = {**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates, return=minimal"}
                res = requests.post(inv_url, headers=headers_with_upsert, json=chunk, timeout=30)
                if res.status_code in [200, 201, 204]:
                    print(f"   ✅ Đã nạp cụm kho xe qua REST {i//CHUNK_SIZE + 1}: {len(chunk)} xe OK.")
                else:
                    print(f"   ❌ Lỗi đẩy cụm kho xe: {res.text}")
    except Exception as e:
        print(f"❌ Lỗi kết nối Supabase kho xe: {e}")

# ===== KHỞI CHẠY CHÍNH =====
def main():
    print("=" * 60)
    # Xác định chế độ chạy dựa trên đối số truyền vào (để phân bổ chu kỳ)
    # Chạy "gps_only": Quét tọa độ mỗi 30p
    # Chạy "full": Quét tất cả (GPS, Đơn, Xe) mỗi 4 tiếng
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    
    print(f"⚡ ĐỒNG BỘ ĐÁM MÂY DMS VINFAST AUTOPILOT 24/7 (Mode: {mode.upper()})")
    print("=" * 60)
    
    dms_headers = get_dms_headers()
    if not dms_headers:
        print("❌ Lỗi cấu hình xác thực DMS. Kết thúc chương trình!")
        return

    if mode == "gps_only":
        sync_gps_live(dms_headers)
    else:
        # Chạy đồng bộ toàn diện tuần tự
        sync_gps_live(dms_headers)
        sync_orders(dms_headers)
        sync_inventory(dms_headers)

    print("\n🎉 Hoàn thành phiên đồng bộ autopilot đám mây thành công!")

if __name__ == "__main__":
    main()
