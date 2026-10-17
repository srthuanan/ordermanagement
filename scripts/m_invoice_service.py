import os
import sys
import re
import json
import time
import base64
import unicodedata
import tempfile
import subprocess
import threading
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import requests

# Connection pooling session to keep SSL connections alive
_session = requests.Session()
_adapter = HTTPAdapter(pool_connections=20, pool_maxsize=20, max_retries=Retry(total=2, backoff_factor=0.3))
_session.mount("http://", _adapter)
_session.mount("https://", _adapter)

# Ensure project root and scripts dir are in sys.path
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)
_SCRIPTS_DIR = os.path.abspath(os.path.dirname(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

try:
    from scripts.sync_thuan_an_allocations import SUPABASE_URL, SUPABASE_KEY
except ImportError:
    try:
        from sync_thuan_an_allocations import SUPABASE_URL, SUPABASE_KEY
    except ImportError:
        SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
        SUPABASE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")

DEFAULT_BASE_URL = "https://4600260039.minvoice.net"

def get_cookie():
    # 1. Env var
    if os.environ.get("MINVOICE_COOKIE"):
        return os.environ.get("MINVOICE_COOKIE").strip()

    # 2. Local ordermanagement file
    local_path = os.path.join(os.path.dirname(__file__), "..", "minvoice_cookie.txt")
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                c = f.read().strip()
                if c: return c
        except Exception:
            pass

    # 3. Documents/BIỂN SỐ file
    alt_path = r"c:\Users\USER\Documents\BIỂN SỐ\minvoice_cookie.txt"
    if os.path.exists(alt_path):
        try:
            with open(alt_path, "r", encoding="utf-8") as f:
                c = f.read().strip()
                if c: return c
        except Exception:
            pass

    # 4. Supabase Storage (Cloud Render fallback)
    try:
        supa_url = f"{SUPABASE_URL}/storage/v1/object/authenticated/yeucauxhd-files/config/minvoice_cookie.txt"
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        r = requests.get(supa_url, headers=headers, timeout=5)
        if r.status_code == 200 and r.text.strip():
            return r.text.strip()
    except Exception:
        pass

    return ""

def get_browser_executable():
    paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser"
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    import shutil
    for cmd in ["google-chrome", "chromium", "chromium-browser", "msedge"]:
        which = shutil.which(cmd)
        if which: return which
    return None

def process_single_vin(vin: str, only_signed: bool = True):
    vin = (vin or "").strip().upper()
    if not vin:
        return {"success": False, "status": "INVALID_VIN", "message": "Số VIN không hợp lệ."}

    cookie = get_cookie()
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookie,
        "Referer": f"{DEFAULT_BASE_URL}/"
    }

    url = f"{DEFAULT_BASE_URL}/api/api/app/invoice?waterMeterCode={vin}"
    try:
        r = _session.get(url, headers=headers, timeout=15)
    except Exception as e:
        return {"success": False, "status": "NETWORK_ERROR", "message": f"Không thể kết nối M-Invoice: {str(e)}"}

    if r.status_code != 200:
        return {"success": False, "status": "AUTH_ERROR", "message": f"M-Invoice phản hồi lỗi HTTP {r.status_code}. Vui lòng cập nhật lại cookie đăng nhập!"}

    try:
        data = r.json()
    except Exception:
        return {"success": False, "status": "INVALID_RESPONSE", "message": "M-Invoice phản hồi định dạng không hợp lệ."}

    items = data.get("items", [])
    if not items:
        return {"success": False, "status": "NOT_FOUND", "message": f"Không tìm thấy hóa đơn nào khớp với số VIN {vin} trên M-Invoice."}

    inv = items[0]
    inv_id = inv.get("id")
    so_hd = inv.get("invoiceNumber") or inv.get("invNo") or "-"
    serial = inv.get("invoiceSerial") or "-"
    date_sign = inv.get("dateSign")
    is_signed = bool(date_sign)
    is_cancelled = (inv.get("invoiceStatus") == 3)
    buyer = inv.get("buyerDisplayName") or inv.get("buyerLegalName") or "Khach_Hang"
    safe_buyer = re.sub(r'[\\/:*?"<>|\s]', '_', buyer).strip()

    if is_cancelled:
        return {
            "success": False,
            "status": "CANCELLED",
            "message": f"Hóa đơn số {so_hd} ({serial}) của VIN {vin} đã bị HỦY trên M-Invoice.",
            "data": {"invoiceNumber": so_hd, "serial": serial, "buyer": buyer}
        }

    if only_signed and not is_signed:
        return {
            "success": False,
            "status": "UNSIGNED",
            "message": f"Hóa đơn số {so_hd} ({serial}) của VIN {vin} CHƯA KÝ SỐ trên M-Invoice. Vui lòng chờ kế toán ký duyệt!",
            "data": {"invoiceNumber": so_hd, "serial": serial, "buyer": buyer, "status": "Chờ ký"}
        }

    file_name = f"{serial}_{so_hd}_{vin}_{safe_buyer}.pdf"
    pdf_bytes = None

    # TỐI ƯU SIÊU TỐC (Fast-Path): Thử tải trực tiếp file PDF từ M-Invoice trước
    # Tiết kiệm 2.5 - 3 giây và tiết kiệm 3.4 MB băng thông HTML thừa
    try:
        url_swich_pdf = f"{DEFAULT_BASE_URL}/api/api/app/invoice/{inv_id}/downloaf-swich-pdf"
        r_pdf = _session.get(url_swich_pdf, headers=headers, timeout=20)
        if r_pdf.status_code == 200 and r_pdf.content.startswith(b"%PDF"):
            pdf_bytes = r_pdf.content
            print(f"[M-Invoice Siêu Tốc] Đã tải trực tiếp HÓA ĐƠN CHUYỂN ĐỔI PDF ({len(pdf_bytes)} bytes) thành công!", file=sys.stderr)
        else:
            url_pdf = f"{DEFAULT_BASE_URL}/api/api/app/invoice/{inv_id}/downloaf-pdf"
            r_pdf = _session.get(url_pdf, headers=headers, timeout=20)
            if r_pdf.status_code == 200 and r_pdf.content.startswith(b"%PDF"):
                pdf_bytes = r_pdf.content
                print(f"[M-Invoice Siêu Tốc] Đã tải trực tiếp HÓA ĐƠN ĐIỆN TỬ PDF ({len(pdf_bytes)} bytes) thành công!", file=sys.stderr)
    except Exception as e:
        print(f"[M-Invoice] Tải trực tiếp PDF thất bại, chuyển sang fallback HTML: {e}", file=sys.stderr)

    # DỰ PHÒNG CẤP 2 (Fallback): Chỉ khi tải PDF trực tiếp thất bại mới tải HTML và in headless Edge/Chrome
    if not pdf_bytes:
        url_swich = f"{DEFAULT_BASE_URL}/api/api/app/invoice/{inv_id}/print-view-swich-html"
        url_html = f"{DEFAULT_BASE_URL}/api/api/app/invoice/{inv_id}/print-view-html"

        try:
            r_html = _session.get(url_swich, headers=headers, timeout=15)
            if r_html.status_code != 200:
                r_html = _session.get(url_html, headers=headers, timeout=15)

            if r_html.status_code == 200:
                res_json = r_html.json()
                master_page = res_json.get("masterPage") or r_html.text
                
                custom_css = """
<style>
@page { size: 210mm 297mm; margin: 0 !important; }
html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; height: 297mm !important; overflow: hidden !important; }
.hoadonmau { width: 210mm !important; height: 297mm !important; margin: 0 auto !important; padding: 5mm 10mm !important; box-sizing: border-box !important; page-break-inside: avoid !important; }
</style>
"""
                clean_html = master_page.replace("</head>", f"{custom_css}</head>") if "</head>" in master_page else custom_css + master_page

                browser_exe = get_browser_executable()
                if browser_exe:
                    scratch_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scratch", "temp_invoices"))
                    os.makedirs(scratch_dir, exist_ok=True)
                    html_file = os.path.join(scratch_dir, f"invoice_{vin}.html")
                    pdf_file = os.path.join(scratch_dir, f"invoice_{vin}.pdf")
                    try:
                        with open(html_file, "w", encoding="utf-8") as f:
                            f.write(clean_html)
                        cmd = [
                            browser_exe,
                            "--headless",
                            "--disable-gpu",
                            "--no-pdf-header-footer",
                            f"--print-to-pdf={pdf_file}",
                            html_file
                        ]
                        subprocess.run(cmd, capture_output=True, timeout=15)
                        if os.path.exists(pdf_file) and os.path.getsize(pdf_file) >= 1000:
                            with open(pdf_file, "rb") as f:
                                pdf_bytes = f.read()
                    except Exception:
                        pass
                    finally:
                        try:
                            if os.path.exists(html_file): os.remove(html_file)
                            if os.path.exists(pdf_file): os.remove(pdf_file)
                        except Exception:
                            pass
        except Exception as e_html:
            print(f"[M-Invoice] Fallback HTML thất bại: {e_html}", file=sys.stderr)

    if not pdf_bytes:
        return {"success": False, "status": "NO_PDF", "message": "Không tìm thấy Microsoft Edge/Chrome và không tải được PDF từ M-Invoice."}

    base64_pdf = base64.b64encode(pdf_bytes).decode("utf-8")
    invoice_date = inv.get("invoiceDate") or inv.get("invDate") or inv.get("issueDate") or inv.get("dateSign")

    return {
        "success": True,
        "status": "SIGNED" if is_signed else "PENDING_SIGN",
        "message": f"Đã lấy thành công hóa đơn số {so_hd} ({serial}) cho xe {buyer}!",
        "data": {
            "vin": vin,
            "invoiceNumber": so_hd,
            "serial": serial,
            "invoiceDate": invoice_date,
            "dateSign": date_sign,
            "isSigned": is_signed,
            "buyer": buyer,
            "totalAmount": inv.get("totalAmount", 0),
            "fileName": file_name,
            "fileSize": len(pdf_bytes),
            "base64Pdf": base64_pdf
        }
    }

def _bg_notify_and_archive(supabase_url: str, headers: dict, order: dict, public_url: str, exact_order_no: str):
    """Background task to send email via Supabase Edge Function and archive to Google Drive asynchronously."""
    mail_status = "Đã gửi mail"
    try:
        ef_url = f"{supabase_url}/functions/v1/send-email"
        mail_payload = {
            "actionId": "invoice_issued",
            "record": {
                **order,
                "link_hoa_don_da_xuat": public_url,
                "invoice_ext": "pdf"
            }
        }
        r_mail = _session.post(ef_url, headers=headers, json=mail_payload, timeout=20)
        if r_mail.status_code not in (200, 201):
            mail_status = f"Lỗi gửi mail: HTTP {r_mail.status_code}"
    except Exception as em:
        mail_status = f"Lỗi gửi mail: {str(em)}"

    try:
        _session.patch(f"{supabase_url}/rest/v1/yeucauxhd?so_don_hang=eq.{exact_order_no}", headers=headers, json={"ket_qua_gui_mail": mail_status}, timeout=10)
    except Exception:
        pass

    try:
        gas_url = "https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec"
        _session.post(gas_url, params={"action": "archiveOrderNow", "orderNumber": exact_order_no}, json={"action": "archiveOrderNow", "orderNumber": exact_order_no}, timeout=15)
    except Exception as egas:
        print(f"[M-Invoice Auto] Lỗi kích hoạt bốc Drive cho đơn {exact_order_no}: {egas}")

def auto_fetch_upload_and_notify(vin: str, order_number: str = None):
    vin = (vin or "").strip().upper()
    order_number = (order_number or "").strip()
    if not vin and not order_number:
        return {"success": False, "status": "INVALID_PARAMS", "message": "Cần cung cấp số VIN hoặc số đơn hàng."}

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    # 0. TÌM ĐƠN HÀNG VÀ KIỂM TRA CHỐNG TRÙNG LẶP SỚM (Early Check - Tiết kiệm 100% thời gian nếu đã xuất HĐ)
    order = None
    if order_number:
        try:
            r_ord = _session.get(f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.{order_number}&select=*", headers=headers, timeout=10)
            if r_ord.status_code == 200 and r_ord.json():
                order = r_ord.json()[0]
                if not vin and order.get("vin"):
                    vin = order["vin"].strip().upper()
        except Exception as e:
            print(f"[M-Invoice Auto] Lỗi tìm đơn hàng {order_number}: {e}")
    elif vin:
        try:
            r_ord = _session.get(f"{SUPABASE_URL}/rest/v1/donhang?vin=eq.{vin}&select=*&order=created_at.desc&limit=1", headers=headers, timeout=10)
            if r_ord.status_code == 200 and r_ord.json():
                order = r_ord.json()[0]
                if not order_number and order.get("so_don_hang"):
                    order_number = order["so_don_hang"].strip()
        except Exception:
            pass

    # Nếu đơn hàng đã có link hóa đơn và trạng thái 'Đã xuất hóa đơn', trả về ngay lập tức (chỉ mất ~0.1s)
    if order:
        existing_url = order.get("link_hoa_don_da_xuat") or order.get("url_hoa_don_da_xuat")
        existing_status = str(order.get("ket_qua") or order.get("trang_thai_xu_ly") or "").strip().lower()
        if existing_status == "đã xuất hóa đơn" and existing_url:
            exact_order_no = order.get("so_don_hang") or order_number
            print(f"[M-Invoice Auto] Đơn hàng {exact_order_no} đã có hóa đơn hoàn tất trước đó. Trả về ngay lập tức!")
            return {
                "success": True,
                "status": "ALREADY_COMPLETED",
                "message": f"Đơn hàng {exact_order_no} đã xuất HĐ và hoàn tất trước đó rồi!",
                "data": {
                    "orderNumber": exact_order_no,
                    "url": existing_url,
                    "mailStatus": "Đã hoàn tất trước đó"
                }
            }

    if not vin:
        return {"success": False, "status": "NO_VIN", "message": f"Đơn hàng {order_number} chưa có số VIN."}

    # 1. Tra cứu và lấy PDF từ M-Invoice (sử dụng Fast-Path tải trực tiếp PDF)
    res = process_single_vin(vin, only_signed=True)
    if not res.get("success"):
        return res

    inv_data = res.get("data", {})
    base64_pdf = inv_data.get("base64Pdf")
    if not base64_pdf:
        return {"success": False, "status": "NO_PDF", "message": "Không nhận được nội dung file PDF từ M-Invoice."}

    pdf_bytes = base64.b64decode(base64_pdf)
    so_hd = inv_data.get("invoiceNumber")
    serial = inv_data.get("serial")
    buyer = inv_data.get("buyer")

    # 2. Tìm đơn hàng nếu chưa tìm thấy
    if not order:
        try:
            r_ord = _session.get(f"{SUPABASE_URL}/rest/v1/donhang?vin=eq.{vin}&select=*&order=created_at.desc&limit=1", headers=headers, timeout=10)
            if r_ord.status_code == 200 and r_ord.json():
                order = r_ord.json()[0]
        except Exception:
            pass

    if not order:
        return {
            "success": False,
            "status": "ORDER_NOT_FOUND",
            "message": f"Tìm thấy HĐ số {so_hd} ({serial}) nhưng không tìm thấy đơn hàng tương ứng với số VIN {vin} trong hệ thống.",
            "data": inv_data
        }

    exact_order_no = order.get("so_don_hang")
    c_name = order.get("ten_khach_hang") or buyer or "KH"

    # Chuẩn hóa tên khách hàng an toàn cho tên file
    c_safe = unicodedata.normalize('NFD', c_name)
    c_safe = re.sub(r'[\u0300-\u036f]', '', c_safe)
    c_safe = re.sub(r'[đĐ]', 'd', c_safe)
    c_safe = re.sub(r'[^a-zA-Z0-9._\-]', '_', c_safe).upper()
    c_safe = re.sub(r'_+', '_', c_safe).strip('_')

    ts = int(time.time() * 1000)
    file_path = f"{exact_order_no}/HOADON_{c_safe}_{ts}.pdf"

    # 3. Tải file lên Supabase Storage bucket 'yeucauxhd-files'
    upload_url = f"{SUPABASE_URL}/storage/v1/object/yeucauxhd-files/{file_path}"
    up_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/pdf",
        "x-upsert": "true"
    }
    
    upload_success = False
    last_up_err = ""
    for attempt in range(1, 4):
        try:
            r_up = _session.post(upload_url, headers=up_headers, data=pdf_bytes, timeout=(15, 60))
            if r_up.status_code in (200, 201):
                upload_success = True
                break
            else:
                last_up_err = f"HTTP {r_up.status_code}: {r_up.text[:120]}"
        except Exception as ex:
            last_up_err = str(ex)
            time.sleep(1.0)

    if not upload_success:
        return {"success": False, "status": "STORAGE_ERROR", "message": f"Lỗi tải file lên Supabase Storage: {last_up_err}"}

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/yeucauxhd-files/{file_path}"

    # 4. Cập nhật database: yeucauxhd & donhang
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%S+07:00')
    raw_date = inv_data.get("dateSign") or inv_data.get("invoiceDate")
    if raw_date and len(str(raw_date)) > 10 and "00:00:00" not in str(raw_date):
        real_invoice_date = raw_date
    elif raw_date and len(str(raw_date)[:10]) == 10:
        real_invoice_date = f"{str(raw_date)[:10]}T{time.strftime('%H:%M:%S')}+07:00"
    else:
        real_invoice_date = now_iso

    patch_hd = {
        "url_hoa_don_da_xuat": public_url,
        "trang_thai": "Đã xuất hóa đơn",
        "ngay_xuat_hoa_don": real_invoice_date,
        "ket_qua_gui_mail": "Đang gửi mail..."
    }
    _session.patch(f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{exact_order_no}", headers=headers, json=patch_hd, timeout=10)

    patch_dh = {
        "ket_qua": "Đã xuất hóa đơn",
        "link_hoa_don_da_xuat": public_url,
        "ngay_xuat_hoa_don": real_invoice_date
    }
    _session.patch(f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.{exact_order_no}", headers=headers, json=patch_dh, timeout=10)

    if vin:
        _session.patch(f"{SUPABASE_URL}/rest/v1/car_hold_activities?vin=eq.{vin}&status=eq.matched", headers=headers, json={"status": "invoiced"}, timeout=10)

    # 5 & 6. BẬT TIẾN TRÌNH NỀN (Daemon Thread): Gửi email và kích hoạt sao lưu Drive bất đồng bộ
    # Giúp giao diện và API phản hồi siêu tốc ngay lập tức (tiết kiệm 8-12 giây chờ đợi)
    t = threading.Thread(
        target=_bg_notify_and_archive,
        args=(SUPABASE_URL, headers, order, public_url, exact_order_no),
        daemon=True
    )
    t.start()

    return {
        "success": True,
        "status": "COMPLETED",
        "message": f"Đã xuất HĐ số {so_hd} ({serial}), lưu file vào hệ thống thành công!",
        "data": {
            "orderNumber": exact_order_no,
            "invoiceNumber": so_hd,
            "serial": serial,
            "buyer": buyer,
            "url": public_url,
            "mailStatus": "Đang gửi mail & đồng bộ Drive ở nền..."
        }
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--vin":
        vin = sys.argv[2] if len(sys.argv) > 2 else ""
        res = process_single_vin(vin)
        # Avoid printing huge base64 in standard stdout unless requested
        if res.get("success") and "--with-base64" not in sys.argv:
            data_copy = dict(res)
            data_copy["data"] = dict(res["data"])
            data_copy["data"]["base64Pdf"] = f"<base64 data {len(res['data']['base64Pdf'])} chars>"
            print(json.dumps(data_copy, ensure_ascii=False))
        else:
            print(json.dumps(res, ensure_ascii=False))
        return

    # Standard mode: read JSON from stdin
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"success": False, "error": "No JSON input provided"}))
            return
        clean_input = raw_input.strip()
        if clean_input.startswith('\ufeff'):
            clean_input = clean_input[1:]
        payload = json.loads(clean_input)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON stdin: {str(e)}"}))
        return

    try:
        action = payload.get("action", "fetch_single")
        if action == "batch_fetch":
            vins = payload.get("vins", [])
            only_signed = payload.get("only_signed", True)
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=4) as executor:
                results = list(executor.map(lambda v: process_single_vin(v, only_signed=only_signed), vins))
            print(json.dumps({"success": True, "results": results}, ensure_ascii=False))
        elif action == "sync_and_notify":
            vin = payload.get("vin", "")
            order_number = payload.get("orderNumber") or payload.get("order_number")
            res = auto_fetch_upload_and_notify(vin, order_number=order_number)
            print(json.dumps(res, ensure_ascii=False))
        else:
            vin = payload.get("vin", "")
            only_signed = payload.get("only_signed", True)
            res = process_single_vin(vin, only_signed=only_signed)
            print(json.dumps(res, ensure_ascii=False))
    except Exception as ex:
        print(json.dumps({"success": False, "status": "ERROR", "message": str(ex)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
