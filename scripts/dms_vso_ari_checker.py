# -*- coding: utf-8 -*-
"""
DMS VSO ➔ ARI Auto-Transitioner:
Tự động đối soát các đơn hàng đang ở trạng thái 'Đã phê duyệt' trên Web/Supabase.
Nếu trên VinFast DMS:
1. Đơn hàng (VSO - xts_newvehiclesalesorders) có trạng thái Hóa đơn (xts_status = 7/10 hoặc có số/ngày HĐ SAP)
2. Đã sinh ra hóa đơn phải thu ARI (xts_accountreceivableinvoices) có trạng thái phát hành (Released)
=> Tự động chuyển đơn hàng sang trạng thái 'Chờ ký hóa đơn', ghi nhận mã ARI và kích hoạt chuyển Drive.
"""

import os
import sys
import json
import time
import requests
import concurrent.futures
from datetime import datetime, timezone
from dotenv import load_dotenv

# Nạp file .env từ thư mục gốc
_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.2"
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = (
    os.environ.get("VITE_SUPABASE_SERVICE_KEY") or 
    os.environ.get("SUPABASE_SERVICE_KEY") or 
    os.environ.get("SUPABASE_KEY") or 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
)

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def get_dms_headers(preferred_dealer=None):
    """Lấy headers xác thực kết nối DMS OData từ dms_dealers_config.json hoặc .env."""
    # Cách 1: Bearer Token từ biến môi trường
    bearer_token = os.environ.get("DMS_BEARER_TOKEN")
    if bearer_token:
        return {
            "Authorization": f"Bearer {bearer_token}",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }

    # Cách 2: Session Cookie từ dms_dealers_config.json
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                dealers = json.load(f)
                target = None
                if preferred_dealer:
                    pref = preferred_dealer.strip().upper()
                    target = next((x for x in dealers if (x.get("dealer_code") or "").strip().upper() == pref and x.get("cookie")), None)
                else:
                    target = next((x for x in dealers if x.get("cookie")), None)

                if target and target.get("cookie"):
                    return {
                        "Cookie": target["cookie"],
                        "Accept": "application/json",
                        "Content-Type": "application/json; charset=utf-8",
                        "OData-MaxVersion": "4.0",
                        "OData-Version": "4.0"
                    }
        except Exception as e:
            print(f"[DMS Auth Warning] Lỗi đọc dms_dealers_config.json: {e}", file=sys.stderr)

    cookie_env = os.environ.get("DMS_SESSION_COOKIE")
    if cookie_env:
        return {
            "Cookie": cookie_env,
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }

    return None

def fetch_approved_orders(order_no_filter=None, check_all=False, order_numbers=None):
    """Lấy danh sách các đơn hàng từ Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/donhang?select=so_don_hang,ten_khach_hang,vin,ket_qua,ngay_xuat_hoa_don"
    if order_no_filter:
        url += f"&so_don_hang=eq.{order_no_filter}"
    elif order_numbers and len(order_numbers) > 0:
        clean_nos = [x.strip() for x in order_numbers if x.strip()]
        if len(clean_nos) == 1:
            url += f"&so_don_hang=eq.{clean_nos[0]}"
        else:
            url += f"&so_don_hang=in.({','.join(clean_nos)})"
    elif check_all:
        url += "&ket_qua=in.(Đã phê duyệt,Chờ ký hóa đơn,Đã xuất hóa đơn)"
    else:
        url += "&ket_qua=eq.Đã phê duyệt"
    
    res = requests.get(url, headers=SUPABASE_HEADERS, timeout=15)
    if res.status_code == 200:
        return res.json()
    else:
        print(f"[Supabase Error] Không lấy được danh sách đơn hàng: {res.text}", file=sys.stderr)
        return []

def check_dms_vso_and_ari(order_number, dms_headers):
    """
    Tra cứu VSO và ARI tương ứng trên VinFast DMS:
    1. VSO có trạng thái Hóa đơn (xts_status = 7/10 hoặc xvf_sapinvoicenumber hoặc xvf_sapinvoicedate)
    2. ARI đã sinh ra và có trạng thái phát hành
    """
    clean_no = order_number.strip()
    vso_query = (
        f"{BASE_API_URL}/xts_newvehiclesalesorders?"
        f"$filter=xts_newvehiclesalesordernumber eq '{clean_no}'"
        f"&$select=xts_newvehiclesalesorderid,xts_newvehiclesalesordernumber,xts_status,statuscode,xvf_sapinvoicenumber,xvf_sapinvoicedate,xts_salesdate"
    )
    
    try:
        r_vso = requests.get(vso_query, headers=dms_headers, timeout=20)
        if r_vso.status_code == 401:
            return {"match": False, "reason": "Cookie DMS đã hết hạn (HTTP 401). Vui lòng dùng Extension đồng bộ lại."}
        if r_vso.status_code != 200:
            return {"match": False, "reason": f"HTTP {r_vso.status_code} khi tra VSO"}
        
        vso_list = r_vso.json().get("value", [])
        if not vso_list:
            return {"match": False, "reason": "Không tìm thấy mã đơn hàng VSO trên DMS"}
        
        vso = vso_list[0]
        vso_id = vso.get("xts_newvehiclesalesorderid")
        vso_status = vso.get("xts_status")
        sap_inv_no = (vso.get("xvf_sapinvoicenumber") or "").strip()
        sap_inv_date = vso.get("xvf_sapinvoicedate") or vso.get("xts_salesdate")
        
        # Kiểm tra điều kiện 1: VSO có trạng thái Hóa đơn
        # 7 = Invoiced, 10 = Invoice Processing
        is_vso_invoiced = (vso_status in [7, 10]) or bool(sap_inv_no) or bool(sap_inv_date)
        if not is_vso_invoiced:
            return {
                "match": False, 
                "vso_status": vso_status, 
                "reason": f"VSO trên DMS chưa ở trạng thái hóa đơn (xts_status={vso_status})"
            }

        # Kiểm tra điều kiện 2: Sinh ra ARI và trạng thái phát hành
        ari_query = (
            f"{BASE_API_URL}/xts_accountreceivableinvoices?"
            f"$filter=_xts_newvehiclesalesorderid_value eq {vso_id}"
            f"&$select=xts_accountreceivableinvoiceid,xts_accountreceivableinvoice,xts_status,statuscode,statecode,xts_invoiceamount,createdon"
            f"&$orderby=createdon desc&$top=1"
        )
        
        r_ari = requests.get(ari_query, headers=dms_headers, timeout=20)
        if r_ari.status_code == 401:
            return {"match": False, "reason": "Cookie DMS đã hết hạn (HTTP 401). Vui lòng dùng Extension đồng bộ lại."}
        if r_ari.status_code != 200:
            return {"match": False, "reason": f"HTTP {r_ari.status_code} khi tra cứu ARI"}
        
        ari_list = r_ari.json().get("value", [])
        if not ari_list:
            return {
                "match": False,
                "vso_status": vso_status,
                "reason": "VSO đã có trạng thái HĐ nhưng DMS chưa sinh bản ghi ARI"
            }
        
        ari = ari_list[0]
        ari_no = (ari.get("xts_accountreceivableinvoice") or "").strip()
        ari_status = ari.get("xts_status")
        state_code = ari.get("statecode")
        
        # Trong VinFast Dynamics 365:
        # xts_status của ARI: 1 = Open/Draft, 2 = Released (Đã phát hành / Posted)
        # hoặc nếu đã có mã ARI chính thức và statecode = 0 (Active)
        is_ari_released = (ari_status == 2) or (bool(ari_no) and state_code == 0)
        
        if not is_ari_released or not ari_no:
            return {
                "match": False,
                "vso_status": vso_status,
                "ari_no": ari_no,
                "ari_status": ari_status,
                "reason": f"ARI chưa ở trạng thái phát hành (xts_status={ari_status})"
            }
            
        inv_date_str = None
        if ari.get("createdon"):
            inv_date_str = ari.get("createdon")
        elif sap_inv_date:
            inv_date_str = sap_inv_date
            
        return {
            "match": True,
            "vso_id": vso_id,
            "vso_status": vso_status,
            "ari_no": ari_no,
            "ari_status": ari_status,
            "invoice_date": inv_date_str,
            "sap_invoice_no": sap_inv_no
        }
        
    except Exception as e:
        return {"match": False, "reason": f"Lỗi ngoại lệ: {str(e)}"}

def transition_order_to_pending_signature(order_number, dms_info):
    """
    Chuyển trạng thái đơn hàng trên Web/Supabase sang 'Chờ ký hóa đơn'
    thông qua RPC rpc_mark_as_pending_signature và ghi nhận số ARI.
    """
    clean_no = order_number.strip()
    inv_date = dms_info.get("invoice_date")
    # Nếu không có giờ phút giây hoặc chỉ có ngày thuần túy, lấy giờ phút giây hiện tại (GMT+7)
    if not inv_date or "00:00:00" in inv_date or len(inv_date) == 10:
        inv_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+07:00")
        
    ari_no = dms_info.get("ari_no", "")
    
    # 1. Gọi RPC rpc_mark_as_pending_signature
    rpc_payload = {
        "p_order_numbers": [clean_no],
        "p_ngay_xuat_hoa_don": inv_date,
        "p_actor_email": "dms_radar@vinfast.vn",
        "p_actor_name": "DMS Auto-Radar (ARI)"
    }
    
    rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/rpc_mark_as_pending_signature"
    res = requests.post(rpc_url, headers=SUPABASE_HEADERS, json=rpc_payload, timeout=20)
    
    if res.status_code in [200, 204]:
        # 2. Cập nhật ghi chú, mã ARI và chính xác timestamp có giờ phút giây vào đơn hàng
        try:
            note_msg = f"[DMS Auto] VSO Đã xuất HĐ, ARI: {ari_no}"
            requests.patch(f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{clean_no}", headers=SUPABASE_HEADERS, json={
                "ghi_chu_admin": note_msg,
                "ngay_xuat_hoa_don": inv_date
            }, timeout=10)
            requests.patch(f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.{clean_no}", headers=SUPABASE_HEADERS, json={
                "ghi_chu": note_msg,
                "ngay_xuat_hoa_don": inv_date
            }, timeout=10)
        except Exception:
            pass
        return True, res.json() if res.content else "OK"
    else:
        return False, f"HTTP {res.status_code}: {res.text}"

def process_single_order(order, idx, total):
    order_no = (order.get("so_don_hang") or "").strip()
    cust_name = (order.get("ten_khach_hang") or "N/A").strip()
    vin = (order.get("vin") or "N/A").strip()
    order_status = (order.get("ket_qua") or "Đã phê duyệt").strip()
    
    # Nhận diện mã showroom từ số đơn hàng: Ví dụ: N31923-VSO-26-10-0062 -> N31923
    dealer_prefix = "N31913"
    if "-" in order_no:
        dealer_prefix = order_no.split("-")[0].strip().upper()
    elif len(order_no) >= 6:
        dealer_prefix = order_no[:6].strip().upper()
        
    print(f"[{idx}/{total}] Đang tra cứu: {order_no} ({dealer_prefix} | {order_status}) | KH: {cust_name}...")
    order_headers = get_dms_headers(preferred_dealer=dealer_prefix)
    
    if not order_headers:
        reason_msg = f"Chưa có Cookie DMS cho showroom [{dealer_prefix}]. Vui lòng dùng Extension đồng bộ."
        print(f"   ⚠️ {order_no}: {reason_msg}")
        return False, {
            "order_no": order_no,
            "customer": cust_name,
            "vin": vin,
            "showroom": dealer_prefix,
            "current_status": order_status,
            "reason": reason_msg
        }
        
    check_result = check_dms_vso_and_ari(order_no, order_headers)
    
    if check_result.get("match"):
        ari_no = check_result.get("ari_no")
        inv_date = check_result.get("invoice_date")
        print(f"   🎉 {order_no}: THỎA MÃN ĐIỀU KIỆN! Đã sinh ARI: {ari_no} (Ngày: {inv_date})")
        
        # Nếu đơn chưa ở 'Chờ ký hóa đơn', thực hiện chuyển trạng thái
        if order_status == "Đã phê duyệt":
            print(f"   🚀 {order_no}: Đang tự động chuyển sang 'Chờ ký hóa đơn'...")
            ok, msg = transition_order_to_pending_signature(order_no, check_result)
            if ok:
                print(f"   ✅ {order_no}: CHUYỂN TRẠNG THÁI THÀNH CÔNG ➔ 'Chờ ký hóa đơn'")
                return True, {
                    "order_no": order_no,
                    "customer": cust_name,
                    "vin": vin,
                    "showroom": dealer_prefix,
                    "ari_no": ari_no,
                    "invoice_date": inv_date
                }
            else:
                err_msg = f"Lỗi cập nhật Supabase: {msg}"
                print(f"   ❌ {order_no}: {err_msg}")
                return False, {
                    "order_no": order_no,
                    "customer": cust_name,
                    "vin": vin,
                    "showroom": dealer_prefix,
                    "current_status": order_status,
                    "reason": err_msg
                }
        else:
            # Đơn đã ở trạng thái khác (ví dụ Chờ ký hoặc Đã xuất), chỉ ghi nhận thông tin ARI và giữ nguyên trạng thái
            print(f"   ℹ️ {order_no}: Đã khớp ARI: {ari_no} (Giữ nguyên trạng thái '{order_status}')")
            return True, {
                "order_no": order_no,
                "customer": cust_name,
                "vin": vin,
                "showroom": dealer_prefix,
                "ari_no": ari_no,
                "invoice_date": inv_date,
                "current_status": order_status,
                "note": f"Khớp ARI trên DMS ({order_status})"
            }
    else:
        reason = check_result.get("reason", "Chưa thỏa mãn")
        print(f"   ⏳ {order_no}: Giữ nguyên '{order_status}': {reason}")
        return False, {
            "order_no": order_no,
            "customer": cust_name,
            "vin": vin,
            "showroom": dealer_prefix,
            "current_status": order_status,
            "reason": reason
        }

def run_sync(order_no_filter=None, check_all=False, order_numbers=None):
    """Thực thi kiểm tra và tự động chuyển đổi trạng thái."""
    print("=" * 70)
    if order_numbers:
        print(f"⚡ BẮT ĐẦU ĐỐI SOÁT DMS VSO ➔ ARI CHO {len(order_numbers)} ĐƠN ĐƯỢC CHỈ ĐỊNH")
    elif check_all:
        print("⚡ BẮT ĐẦU ĐỐI SOÁT DMS VSO ➔ ARI CHO CÁC ĐƠN ĐÃ DUYỆT & CHỜ KÝ")
    else:
        print("⚡ BẮT ĐẦU ĐỐI SOÁT DMS VSO ➔ ARI CHO CÁC ĐƠN 'ĐÃ PHÊ DUYỆT'")
    print("=" * 70)
    
    approved_orders = fetch_approved_orders(order_no_filter, check_all=check_all, order_numbers=order_numbers)
    print(f"📋 Tìm thấy {len(approved_orders)} đơn hàng cần kiểm tra trên Web.")
    
    if not approved_orders:
        print("✅ Hiện không có đơn hàng nào cần kiểm tra.")
        return {"success": True, "total_checked": 0, "transitioned_count": 0, "transitioned": [], "unprocessed": []}
    
    transitioned_list = []
    unprocessed_list = []
    total = len(approved_orders)
    
    # Chạy đa luồng song song (5 workers) để tăng tốc độ kiểm tra gấp 5 lần
    max_workers = min(5, total) if total > 1 else 1
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {
            executor.submit(process_single_order, order, idx, total): order
            for idx, order in enumerate(approved_orders, 1)
        }
        for future in concurrent.futures.as_completed(future_map):
            try:
                is_trans, data = future.result()
                if is_trans:
                    transitioned_list.append(data)
                else:
                    unprocessed_list.append(data)
            except Exception as e:
                err_order = future_map[future]
                unprocessed_list.append({
                    "order_no": err_order.get("so_don_hang", "N/A"),
                    "customer": err_order.get("ten_khach_hang", "N/A"),
                    "reason": f"Lỗi luồng: {str(e)}"
                })
            
    print("\n" + "=" * 70)
    print(f"🎉 HOÀN TẤT ĐỐI SOÁT: {len(transitioned_list)}/{len(approved_orders)} đơn hàng đã có ARI trên DMS!")
    print("=" * 70)
    
    return {
        "success": True,
        "total_checked": len(approved_orders),
        "transitioned_count": len(transitioned_list),
        "transitioned": transitioned_list,
        "unprocessed": unprocessed_list,
        "summary": f"Đã kiểm tra {len(approved_orders)} đơn: {len(transitioned_list)} đơn có ARI trên DMS, {len(unprocessed_list)} đơn giữ nguyên."
    }

if __name__ == "__main__":
    filter_arg = None
    check_all = False
    order_numbers = None
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == "--all":
            check_all = True
        elif arg == "--orders" and i + 1 < len(sys.argv):
            order_numbers = [x.strip() for x in sys.argv[i + 1].split(",") if x.strip()]
            i += 1
        elif not arg.startswith("--"):
            filter_arg = arg
        i += 1
    res = run_sync(filter_arg, check_all=check_all, order_numbers=order_numbers)
    print("__JSON_RESULT_START__")
    print(json.dumps(res, ensure_ascii=False, indent=2))
    print("__JSON_RESULT_END__")
