import os
import sys
import re
import json
import base64
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

    return ""

def get_browser_executable():
    paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    ]
    for p in paths:
        if os.path.exists(p):
            return p
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

    browser_exe = get_browser_executable()
    if not browser_exe:
        return {"success": False, "status": "NO_BROWSER", "message": "Không tìm thấy Microsoft Edge hoặc Chrome trên máy để xuất file PDF."}

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
        res_cmd = subprocess.run(cmd, capture_output=True, timeout=15)

        if not os.path.exists(pdf_file) or os.path.getsize(pdf_file) < 1000:
            return {"success": False, "status": "PDF_CONVERT_FAIL", "message": "Xuất file PDF thất bại."}

        with open(pdf_file, "rb") as f:
            pdf_bytes = f.read()

        base64_pdf = base64.b64encode(pdf_bytes).decode("utf-8")
        file_name = f"{serial}_{so_hd}_{vin}_{safe_buyer}.pdf"

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
    except Exception as e:
        return {"success": False, "status": "CONVERT_ERROR", "message": f"Lỗi tạo file PDF: {str(e)}"}
    finally:
        # Cleanup
        try:
            if os.path.exists(html_file): os.remove(html_file)
            if os.path.exists(pdf_file): os.remove(pdf_file)
            if os.path.exists(temp_dir): os.rmdir(temp_dir)
        except Exception:
            pass

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
    else:
        vin = payload.get("vin", "")
        only_signed = payload.get("only_signed", True)
        res = process_single_vin(vin, only_signed=only_signed)
        print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
