# -*- coding: utf-8 -*-
"""
Module: dms_vso_lookup.py
Mục đích: Tra cứu trực tiếp đơn hàng VSO từ VinFast Dynamics OData và tự động upsert vào Supabase.
Hỗ trợ cả môi trường Local lẫn Vercel Serverless Function (Python).
"""

import os
import json
import requests
from urllib.parse import quote

def get_dealers_list():
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

    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def get_dms_lookup_name(item, field):
    if not item:
        return ""
    f = field.lower()
    for k, v in item.items():
        kl = k.lower()
        if f in kl and "@odata.community.display.v1.formattedvalue" in kl:
            return str(v) if v is not None else ""
    for k, v in item.items():
        kl = k.lower()
        if f in kl and "_value" in kl:
            return str(v) if v is not None else ""
    val = item.get(field)
    return str(val) if val is not None else ""

def lookup_dms_vso(vso_raw):
    clean_no = (vso_raw or "").strip().upper().replace("-VS0-", "-VSO-")
    if not clean_no:
        return {"success": False, "found": False, "error": "Thiếu mã đơn hàng VSO"}
    
    dealers = get_dealers_list()
    d_code = clean_no.split("-")[0].strip().upper() if "-" in clean_no else ""
    target_dealer = next((x for x in dealers if (x.get("dealer_code") or "").upper() == d_code and x.get("cookie")), None)
    if not target_dealer:
        target_dealer = next((x for x in dealers if x.get("cookie")), None)
    
    if not target_dealer or not target_dealer.get("cookie"):
        return {
            "success": False,
            "found": False,
            "error": f"Chưa có Cookie DMS hoạt động cho showroom [{d_code}]. Vui lòng dùng Extension/Bookmarklet đồng bộ lại."
        }
    
    headers = {
        "Cookie": target_dealer["cookie"],
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
    }
    
    query_url = f"https://vinfastdms.crm5.dynamics.com/api/data/v9.2/xts_newvehiclesalesorders?$filter=xts_newvehiclesalesordernumber eq '{quote(clean_no)}'"
    try:
        res = requests.get(query_url, headers=headers, timeout=20)
        if res.status_code == 401:
            return {
                "success": False,
                "found": False,
                "error": f"Cookie của đại lý [{d_code}] đã hết hạn (401). Vui lòng dùng Extension/Bookmarklet cập nhật lại."
            }
        if res.status_code != 200:
            return {
                "success": False,
                "found": False,
                "error": f"Lỗi kết nối VinFast DMS (HTTP {res.status_code})"
            }
        
        data = res.json()
        items = data.get("value", [])
        if not items:
            return {
                "success": True,
                "found": False,
                "error": f"Không tìm thấy Số đơn hàng {clean_no} trên hệ thống VinFast DMS."
            }
        
        item = items[0]
        inv_date = item.get("xvf_sapinvoicedate") or item.get("xts_salesdate")
        has_sap_inv = bool(item.get("xvf_sapinvoicenumber"))
        is_inv_status = str(item.get("xts_status")) in ["7", "10"]
        status_text = (get_dms_lookup_name(item, "xts_status") or "").lower()
        is_blocked = any(b in status_text for b in ["hóa đơn", "invoiced", "hủy", "cancel", "void", "closed", "đã giao", "hoàn tất"])
        
        is_open = not inv_date and not has_sap_inv and not is_inv_status and not is_blocked
        
        order_record = {
            "new_vehicle_sales_order_id": item.get("xts_newvehiclesalesorderid", ""),
            "kiem_tra_tong_cho_hang": "",
            "ngay_sua_doi": item.get("modifiedon"),
            "ngay_giao_dich": str(item.get("xts_transactiondate"))[:10] if item.get("xts_transactiondate") else None,
            "tu_van_ban_hang": get_dms_lookup_name(item, "xts_salespersonid") or get_dms_lookup_name(item, "ownerid") or "",
            "so_don_hang_ban": item.get("xts_newvehiclesalesordernumber") or clean_no,
            "so_bao_gia_xe": get_dms_lookup_name(item, "xts_newvehiclesalesquoteid") or "",
            "ngay_xuat_hoa_don": str(inv_date)[:10] if inv_date else None,
            "khach_hang_tiem_nang": get_dms_lookup_name(item, "xts_potentialcustomerid") or item.get("xts_potentialcustomerdescription") or "",
            "promotion": get_dms_lookup_name(item, "xvf_promotionid") or item.get("itv_promotiondetail") or "",
            "ma_khach_hang": item.get("xts_customernumber") or "",
            "mo_ta_san_pham": item.get("xts_productdescription") or get_dms_lookup_name(item, "xts_productid") or "",
            "ten_phien_ban": get_dms_lookup_name(item, "xvf_characteristicconfiguration") or get_dms_lookup_name(item, "xts_productconfigurationid") or "",
            "loai_tran": get_dms_lookup_name(item, "itv_characteristicceilingid") or "",
            "mau_ngoai_that": item.get("xvf_exteriorcolor") or get_dms_lookup_name(item, "xts_productexteriorcolorid") or "",
            "mau_noi_that": item.get("xvf_interiorcolor") or get_dms_lookup_name(item, "xts_productinteriorcolorid") or "",
            "ma_phien_ban": get_dms_lookup_name(item, "xvf_vehiclepackage") or "",
            "ma_mau_ngoai_that": get_dms_lookup_name(item, "xts_productexteriorcolorid") or get_dms_lookup_name(item, "xvf_characteristicexteriorcolor") or "",
            "ma_mau_noi_that": get_dms_lookup_name(item, "xts_productinteriorcolorid") or get_dms_lookup_name(item, "xvf_characteristicinteriorcolor") or "",
            "trang_thai": get_dms_lookup_name(item, "xts_status") or ("Mở" if is_open else "Hóa đơn"),
            "pre_customer": get_dms_lookup_name(item, "itv_customerpreorderid") or get_dms_lookup_name(item, "itv_leadid") or "",
            "so_vin": get_dms_lookup_name(item, "xts_chassisid") or item.get("xts_chassisnumber") or "",
            "accessory_serial": get_dms_lookup_name(item, "xts_stockid") or "",
            "ma_san_pham": get_dms_lookup_name(item, "xts_productid") or "",
            "so_ton_kho": get_dms_lookup_name(item, "xts_stockid") or "",
            "so_tien_thuc_sau_thue": item.get("xts_netamountaftertax") or item.get("xvf_grandtotal") or 0,
            "don_hang_goc": get_dms_lookup_name(item, "xts_originalnewvehiclesalesorderreferenceid") or "",
            "chi_nhanh": get_dms_lookup_name(item, "xts_businessunitid") or ""
        }
        
        # Tự động nạp vào Supabase donhanghienhuu nếu là đơn Mở
        if is_open:
            supabase_url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "https://jwvgxqrkjlbewvpkvucj.supabase.co"
            supabase_key = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")
            if supabase_url and supabase_key:
                try:
                    orders_url = f"{supabase_url.rstrip('/')}/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban"
                    sb_headers = {
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates, return=minimal"
                    }
                    requests.post(orders_url, headers=sb_headers, json=[order_record], timeout=10)
                except Exception as sb_err:
                    print(f"[DMS Lookup Supabase Upsert Warning]: {sb_err}")
        
        return {
            "success": True,
            "found": True,
            "isOpen": is_open,
            "order": order_record
        }
    except Exception as e:
        return {"success": False, "found": False, "error": f"Lỗi gọi DMS: {str(e)}"}

def check_dms_cookie_health(cookie_str=None, dealer_code=None):
    """Kiểm tra tính hợp lệ và thời hạn (WhoAmI) của Cookie DMS."""
    if not cookie_str and dealer_code:
        dealers = get_dealers_list()
        found = next((x for x in dealers if (x.get("dealer_code") or "").upper() == str(dealer_code).upper()), None)
        if found and found.get("cookie"):
            cookie_str = found["cookie"]
            
    if not cookie_str:
        return {
            "status": "error",
            "valid": False,
            "statusCode": 400,
            "dealer_code": dealer_code or "",
            "message": "Thiếu cookie hoặc không tìm thấy cookie của đại lý đã chọn."
        }
    
    headers = {
        "Cookie": cookie_str,
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }
    try:
        ping_res = requests.get("https://vinfastdms.crm5.dynamics.com/api/data/v9.2/WhoAmI", headers=headers, timeout=10)
        if ping_res.status_code == 200:
            data = ping_res.json()
            return {
                "status": "ok",
                "valid": True,
                "statusCode": 200,
                "dealer_code": dealer_code or "",
                "userId": data.get("UserId", ""),
                "businessUnitId": data.get("BusinessUnitId", ""),
                "message": "Cookie DMS hợp lệ và đang hoạt động tốt!"
            }
        elif ping_res.status_code == 401:
            return {
                "status": "error",
                "valid": False,
                "statusCode": 401,
                "dealer_code": dealer_code or "",
                "message": "Cookie đã hết hạn (HTTP 401 Unauthorized)."
            }
        else:
            return {
                "status": "error",
                "valid": False,
                "statusCode": ping_res.status_code,
                "dealer_code": dealer_code or "",
                "message": f"DMS phản hồi mã lỗi HTTP {ping_res.status_code}"
            }
    except Exception as e:
        return {
            "status": "error",
            "valid": False,
            "statusCode": 500,
            "dealer_code": dealer_code or "",
            "message": f"Lỗi kết nối tới DMS: {str(e)}"
        }

