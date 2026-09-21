import os
import sys
import re
import json
import time
import base64
import unicodedata
import tempfile
import subprocess
import requests

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
        from scripts.sync_thuan_an_allocations import SUPABASE_URL, SUPABASE_KEY
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
        r = requests.get(url, headers=headers, timeout=15)
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

    # Lấy HTML hóa đơn chuyển đổi
    url_swich = f"{DEFAULT_BASE_URL}/api/api/app/invoice/{inv_id}/print-view-swich-html"
    url_html = f"{DEFAULT_BASE_URL}/api/api/app/invoice/{inv_id}/print-view-html"

    try:
        r_html = requests.get(url_swich, headers=headers, timeout=15)
        if r_html.status_code != 200:
            r_html = requests.get(url_html, headers=headers, timeout=15)

        if r_html.status_code != 200:
            return {"success": False, "status": "HTML_ERROR", "message": f"Lỗi tải mã hóa đơn: HTTP {r_html.status_code}"}

        res_json = r_html.json()
        master_page = res_json.get("masterPage") or r_html.text
    except Exception as e:
        return {"success": False, "status": "HTML_ERROR", "message": f"Lỗi lấy nội dung hóa đơn: {str(e)}"}

    # Tiêm CSS định dạng chuẩn 1 mặt A4 (210mm x 297mm) không tràn trang
    custom_css = """
<style>
@page {
    size: 210mm 297mm;
    margin: 0 !important;
}
html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm !important;
    height: 297mm !important;
    overflow: hidden !important;
}
.hoadonmau {
    width: 210mm !important;
    height: 297mm !important;
    margin: 0 auto !important;
    padding: 5mm 10mm !important;
    box-sizing: border-box !important;
    page-break-inside: avoid !important;
    page-break-after: avoid !important;
    page-break-before: avoid !important;
}
</style>
"""
    if "</head>" in master_page:
        clean_html = master_page.replace("</head>", f"{custom_css}</head>")
    else:
        clean_html = custom_css + master_page

    file_name = f"{serial}_{so_hd}_{vin}_{safe_buyer}.pdf"
    pdf_bytes = None

    # Cách 1: Tải trực tiếp file PDF chính gốc đã ký số từ M-Invoice API (nhanh, chuẩn 100%, không cần cài Chrome trên Cloud)
    try:
        url_pdf = f"{DEFAULT_BASE_URL}/api/api/app/invoice/{inv_id}/downloaf-pdf"
        r_pdf = requests.get(url_pdf, headers=headers, timeout=15)
        if r_pdf.status_code == 200 and r_pdf.content.startswith(b"%PDF"):
            pdf_bytes = r_pdf.content
    except Exception as e:
        print(f"[M-Invoice] Tải trực tiếp PDF thất bại: {e}")

    # Cách 2: Dự phòng dùng Chrome/Edge in headless sang PDF nếu M-Invoice không trả về trực tiếp
    if not pdf_bytes:
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

    if not pdf_bytes:
        return {"success": False, "status": "NO_PDF", "message": "Không tìm thấy Microsoft Edge/Chrome và không tải được PDF từ M-Invoice."}

    base64_pdf = base64.b64encode(pdf_bytes).decode("utf-8")

    return {
        "success": True,
        "status": "SIGNED" if is_signed else "PENDING_SIGN",
        "message": f"Đã lấy thành công hóa đơn số {so_hd} ({serial}) cho xe {buyer}!",
        "data": {
            "vin": vin,
            "invoiceNumber": so_hd,
            "serial": serial,
            "dateSign": date_sign,
            "isSigned": is_signed,
            "buyer": buyer,
            "totalAmount": inv.get("totalAmount", 0),
            "fileName": file_name,
            "fileSize": len(pdf_bytes),
            "base64Pdf": base64_pdf
        }
    }

def auto_fetch_upload_and_notify(vin: str, order_number: str = None):
    vin = (vin or "").strip().upper()
    order_number = (order_number or "").strip()
    if not vin and not order_number:
        return {"success": False, "status": "INVALID_PARAMS", "message": "Cần cung cấp số VIN hoặc số đơn hàng."}

    from scripts.sync_thuan_an_allocations import SUPABASE_URL, SUPABASE_KEY
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    # Nếu chưa có VIN nhưng có order_number, tìm VIN từ đơn hàng
    order = None
    if order_number:
        try:
            r_ord = requests.get(f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.{order_number}&select=*", headers=headers, timeout=10)
            if r_ord.status_code == 200 and r_ord.json():
                order = r_ord.json()[0]
                if not vin and order.get("vin"):
                    vin = order["vin"].strip().upper()
        except Exception as e:
            print(f"[M-Invoice Auto] Lỗi tìm đơn hàng {order_number}: {e}")

    if not vin:
        return {"success": False, "status": "NO_VIN", "message": f"Đơn hàng {order_number} chưa có số VIN."}

    # 1. Tra cứu và lấy PDF từ M-Invoice
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
            r_ord = requests.get(f"{SUPABASE_URL}/rest/v1/donhang?vin=eq.{vin}&select=*&order=created_at.desc&limit=1", headers=headers, timeout=10)
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
    r_up = requests.post(upload_url, headers=up_headers, data=pdf_bytes, timeout=15)
    if r_up.status_code not in (200, 201):
        return {"success": False, "status": "STORAGE_ERROR", "message": f"Lỗi tải file lên Supabase Storage: HTTP {r_up.status_code}"}

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/yeucauxhd-files/{file_path}"

    # 4. Cập nhật database: yeucauxhd & donhang
    patch_hd = {"url_hoa_don_da_xuat": public_url, "ket_qua_gui_mail": "Đang gửi mail..."}
    requests.patch(f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{exact_order_no}", headers=headers, json=patch_hd, timeout=10)

    patch_dh = {"ket_qua": "Đã xuất hóa đơn", "link_hoa_don_da_xuat": public_url}
    requests.patch(f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.{exact_order_no}", headers=headers, json=patch_dh, timeout=10)

    if vin:
        requests.patch(f"{SUPABASE_URL}/rest/v1/car_hold_activities?vin=eq.{vin}&status=eq.matched", headers=headers, json={"status": "invoiced"}, timeout=10)

    # 5. Gửi email qua Edge Function 'send-email'
    mail_status = "Đã gửi mail"
    try:
        ef_url = f"{SUPABASE_URL}/functions/v1/send-email"
        mail_payload = {
            "actionId": "invoice_issued",
            "record": {
                **order,
                "link_hoa_don_da_xuat": public_url,
                "invoice_ext": "pdf"
            }
        }
        r_mail = requests.post(ef_url, headers=headers, json=mail_payload, timeout=15)
        if r_mail.status_code not in (200, 201):
            mail_status = f"Lỗi gửi mail: HTTP {r_mail.status_code}"
    except Exception as em:
        mail_status = f"Lỗi gửi mail: {str(em)}"

    requests.patch(f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{exact_order_no}", headers=headers, json={"ket_qua_gui_mail": mail_status}, timeout=10)

    return {
        "success": True,
        "status": "COMPLETED",
        "message": f"Đã xuất HĐ số {so_hd} ({serial}), lưu file vào Supabase và {mail_status.lower()} thành công!",
        "data": {
            "orderNumber": exact_order_no,
            "invoiceNumber": so_hd,
            "serial": serial,
            "buyer": buyer,
            "url": public_url,
            "mailStatus": mail_status
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
        payload = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON stdin: {str(e)}"}))
        return

    action = payload.get("action", "fetch_single")
    if action == "batch_fetch":
        vins = payload.get("vins", [])
        results = []
        for v in vins:
            results.append(process_single_vin(v, only_signed=payload.get("only_signed", True)))
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

if __name__ == "__main__":
    main()
