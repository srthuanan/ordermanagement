"""
zalo_coc_watcher.py - Tiến trình tự động theo dõi ảnh Zalo PC & Clipboard
1. Lắng nghe tức thì sự kiện có ảnh mới trong nhóm Showroom Thuận An & XHĐ Thuận An (Watchdog).
2. Lắng nghe tức thì khi người dùng bấm "Sao chép hình ảnh" (Pillow Clipboard Grab).
3. Lọc nhanh bằng Windows OCR nội bộ để loại bỏ ảnh không phải COC.
4. AI Gemini trích xuất danh sách VIN và ngày gửi thực tế trên Zalo để điền vào Sheet RÚT COC.
"""

import os
import sys
import time
import json
import re
import base64
import hashlib
import logging
import datetime
import urllib.request
import subprocess
import ctypes
import io
from PIL import ImageGrab, Image
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(SCRIPT_DIR, "zalo_coc_watcher.log")
PROCESSED_FILE = os.path.join(SCRIPT_DIR, "zalo_coc_processed.json")
PID_FILE = os.path.join(SCRIPT_DIR, "zalo_coc_watcher.pid")
OCR_WORKER = os.path.join(SCRIPT_DIR, "ocr_worker.ps1")
TEMP_CLIPBOARD_IMG = os.path.join(SCRIPT_DIR, "clipboard_temp.jpg")

# Ghi PID của tiến trình hiện tại
try:
    with open(PID_FILE, "w", encoding="utf-8") as f:
        f.write(str(os.getpid()))
except Exception:
    pass

# Cấu hình logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
logger.addHandler(file_handler)

# Chỉ in ra Console nếu stdout tồn tại (khi chạy bằng python.exe thường, không phải pythonw)
if sys.stdout is not None:
    try:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logger.addHandler(console_handler)
    except Exception:
        pass


def handle_uncaught_exception(exc_type, exc_value, exc_traceback):
    logging.critical("Lỗi nghiêm trọng ngoài dự kiến:", exc_info=(exc_type, exc_value, exc_traceback))

sys.excepthook = handle_uncaught_exception

USER_PROFILE = os.environ.get("USERPROFILE", r"C:\Users\Pham Thanh Nhan")
ZALO_RESOURCE_DIR = os.path.join(
    USER_PROFILE,
    r"AppData\Roaming\ZaloData\media\2297773701172183608\ZaloDownloads\resource"
)

# Cả 2 nhóm của Thuận An: Nhóm Showroom & Nhóm XHĐ
SHOWROOM_GROUP_DIRS = [
    os.path.join(ZALO_RESOURCE_DIR, "g77085409175744202"),  # Nhóm XHĐ Thuận An
    os.path.join(ZALO_RESOURCE_DIR, "g3257225823586885864"),  # Nhóm Showroom Thuận An
]

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
ANON_KEY = "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX"
SERVICE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

COC_KEYWORDS = [
    "BIEN BAN", "BIEN", "BIÉN", "BAN GIAO", "GIAO TRA", "GIAO TRÅ", "TRA GIAY", "TRÅ GIÅY",
    "GIAY TO", "GIÅY", "XUAT XUONG", "XUẤT XƯỞNG", "PHIEU KIEM TRA", "PHIẾU KIỂM TRA",
    "CHUNG NHAN", "CHỨNG NHẬN", "GIAO NHAN", "CHUNG TU", "CHỨNG TỪ", "THOẢ THUẬN", "THOA THUAN",
    "THUAN AN", "THUẬN AN", "MINH DAO", "MINH ĐẠO", "COC VE", "COC VỀ"
]

def has_coc_signals(ocr_text):
    """Kiểm tra ảnh có chứa tín hiệu biên bản giao nhận/trả giấy tờ COC hoặc số khung xe không."""
    ocr_upper = (ocr_text or "").upper()
    
    # 1. Bỏ qua tuyệt đối nếu là ảnh bảng tính / sổ theo dõi Google Sheet / báo cáo
    table_ignore_markers = [
        "SO THEO DOI", "SỔ THEO DÕI", "RUT COC", "RÚT COC",
        "CHINH SACH", "CHÍNH SÁCH", "GIAI NGAN", "GIẢI NGÂN",
        "KHACH THANH TOAN", "KHÁCH THANH TOÁN", "NGAN HANG",
        "BANG TINH", "SPREADSHEET", "EXCEL", "SHOWROOM", "THUẬN AN - SỔ"
    ]
    if any(m in ocr_upper for m in table_ignore_markers):
        return False, "Bảng tính/sổ theo dõi"

    # 2. Kiểm tra từ khóa biên bản
    matched = [kw for kw in COC_KEYWORDS if kw in ocr_upper]
    if matched:
        return True, f"Khớp từ khóa {matched[:3]}"

    # 3. Kiểm tra số khung xe VinFast (RNX, RLN, RLL, RNN... 15-17 ký tự)
    vin_matches = re.findall(r'\b(R[NLX][A-Z0-9]{13,15})\b', ocr_upper)
    if len(vin_matches) >= 1:
        return True, f"Tìm thấy số khung xe {vin_matches[:3]}"

    return False, "Không có tín hiệu biên bản COC"

last_clipboard_hash = None


def load_processed_files():
    if os.path.exists(PROCESSED_FILE):
        try:
            with open(PROCESSED_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()


def save_processed_files(processed_set):
    try:
        trimmed = list(processed_set)[-5000:]
        with open(PROCESSED_FILE, "w", encoding="utf-8") as f:
            json.dump(trimmed, f, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Lỗi lưu processed_files: {e}")


def show_windows_notification(title, message):
    """Hiển thị thông báo Toast trên màn hình Windows."""
    try:
        clean_title = str(title).replace('"', "'")
        clean_msg = str(message).replace('"', "'")
        ps_script = f"""
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
        $template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
        $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template)
        $textNodes = $xml.GetElementsByTagName("text")
        $textNodes.Item(0).AppendChild($xml.CreateTextNode("{clean_title}")) > $null
        $textNodes.Item(1).AppendChild($xml.CreateTextNode("{clean_msg}")) > $null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("{{1AC14E77-02E7-4E5D-B744-22DA43871289}}\\WindowsPowerShell\\v1.0\\powershell.exe").Show($toast)
        """
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, timeout=5, creationflags=0x08000000)
    except Exception:
        pass


def run_local_fast_ocr(image_path):
    """Sử dụng Windows Media OCR quét nhanh nội dung ảnh trong 0.2s để phát hiện chữ."""
    if not os.path.exists(OCR_WORKER):
        return ""
    try:
        cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", OCR_WORKER, "-ImagePath", image_path]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10, creationflags=0x08000000)
        return (res.stdout or "").upper()
    except Exception:
        return ""


def call_gemini_scan(image_path):
    """Gọi AI Gemini qua Edge Function để trích xuất số khung và ngày biên bản chính xác 100%."""
    try:
        # Tối ưu hóa kích thước ảnh (max 1600px) để upload siêu tốc, tránh timeout Edge Function
        with Image.open(image_path) as im:
            w, h = im.size
            max_dim = 1600
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                new_w, new_h = int(w * scale), int(h * scale)
                im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            im.convert("RGB").save(buf, format="JPEG", quality=88)
            img_bytes = buf.getvalue()

        b64_data = base64.b64encode(img_bytes).decode("utf-8")

        payload = {
            "files": [{"base64Data": b64_data, "mimeType": "image/jpeg"}],
            "action": "scan-coc-receipt"
        }
        headers = {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}"
        }

        req = urllib.request.Request(
            f"{SUPABASE_URL}/functions/v1/scan-pdf",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=70) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            if res.get("success") and res.get("data"):
                return res["data"]
    except Exception as e:
        logging.warning(f"Lỗi quét Gemini cho {os.path.basename(image_path)}: {e}")
    return None


def update_google_sheet_coc(vins, receipt_date, overwrite=False):
    """Cập nhật ngày COC về vào Cột O trên sheet RÚT COC của Showroom."""
    today_str = datetime.datetime.now().strftime("%d/%m/%Y")
    target_date = receipt_date if receipt_date else today_str

    js_code = f"""
    (function() {{
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('RÚT COC');
      if (!sheet) return {{ success: false, error: 'Sheet not found' }};
      
      var vins = {json.dumps(vins)};
      var targetDate = "{target_date}";
      var allowOverwrite = {json.dumps(overwrite)};
      var maxR = sheet.getLastRow();
      if (maxR < 3) return {{ success: true, updated: 0 }};
      
      var vinColVals = sheet.getRange(3, 5, maxR - 2, 1).getValues();
      var updatedCount = 0;
      var updatedRows = [];
      
      for (var i = 0; i < vinColVals.length; i++) {{
        var cellVin = String(vinColVals[i][0] || '').trim().toUpperCase();
        if (!cellVin) continue;
        
        for (var j = 0; j < vins.length; j++) {{
          if (cellVin === vins[j]) {{
            var rIdx = i + 3;
            var cellO = sheet.getRange(rIdx, 15);
            var existingVal = String(cellO.getValue() || '').trim();
            // KHÔNG GHI ĐÈ nếu ô này đã có ngày COC về từ trước (trừ khi allowOverwrite = true)
            if (existingVal !== '' && !allowOverwrite) {{
              break;
            }}
            cellO.setValue(targetDate);
            cellO.setBackground('#E6F4EA');
            cellO.setFontWeight('bold');
            cellO.setHorizontalAlignment('center');
            updatedCount++;
            updatedRows.push({{ row: rIdx, vin: cellVin }});
            break;
          }}
        }}
      }}
      
      return {{
        success: true,
        updatedCount: updatedCount,
        updatedRows: updatedRows,
        targetDate: targetDate
      }};
    }})()
    """

    try:
        req = urllib.request.Request(
            GAS_WEBAPP_URL,
            data=json.dumps({"action": "EXECUTE_SCRIPT", "code": js_code}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            return res.get("data", {})
    except Exception as e:
        logging.error(f"Lỗi cập nhật Google Sheets: {e}")
        return None


def sync_coc_to_supabase_orders(vins, receipt_date):
    """Đồng bộ ngày COC về vào Supabase: donhang, yeucauxhd, archived_orders, khoxe, và tạo thông báo chuông cho TVBH."""
    if not vins or not receipt_date:
        return {"updated": 0}

    today_str = datetime.datetime.now().strftime("%d/%m/%Y")
    target_date = receipt_date if receipt_date else today_str
    headers = {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Prefer": "return=representation"
    }

    updated_count = 0
    notified_users = set()

    for vin in vins:
        clean_vin = vin.strip().upper()
        if len(clean_vin) < 10:
            continue

        try:
            # 1. Tra cứu đơn hàng trong yeucauxhd & donhang
            lookup_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?vin=eq.{clean_vin}&select=so_don_hang,ten_khach_hang,tvbh,ghi_chu_admin,ngay_coc_ve"
            req_lookup = urllib.request.Request(lookup_url, headers=headers, method="GET")
            orders = []
            try:
                with urllib.request.urlopen(req_lookup, timeout=15) as resp:
                    orders = json.loads(resp.read().decode("utf-8"))
            except Exception as le:
                logging.warning(f"Lỗi tra cứu yeucauxhd cho VIN {clean_vin}: {le}")

            order_info = orders[0] if orders else None

            if not order_info:
                try:
                    lookup_dh = f"{SUPABASE_URL}/rest/v1/donhang?vin=eq.{clean_vin}&select=so_don_hang,ten_khach_hang,tvbh,ngay_coc_ve"
                    req_dh_get = urllib.request.Request(lookup_dh, headers=headers, method="GET")
                    with urllib.request.urlopen(req_dh_get, timeout=15) as resp_dh:
                        dh_list = json.loads(resp_dh.read().decode("utf-8"))
                        if dh_list:
                            order_info = dh_list[0]
                except Exception:
                    pass

            existing_coc = ((order_info.get("ngay_coc_ve") or "") if order_info else "").strip()
            # Nếu xe này đã có đúng ngày COC về này rồi -> Bỏ qua mọi thao tác ghi đè và TUYỆT ĐỐI KHÔNG BẮN THÔNG BÁO LẠI
            if existing_coc and existing_coc == target_date:
                logging.info(f"ℹ️ Xe {clean_vin} đã có ngày COC về ({existing_coc}). Bỏ qua cập nhật & không gửi thông báo trùng lặp.")
                continue

            # 2. Cập nhật yeucauxhd nếu tìm thấy
            if order_info:
                current_note = order_info.get("ghi_chu_admin") or ""
                coc_tag = f"[COC về: {target_date}]"
                new_note = current_note
                if "COC về" not in current_note:
                    new_note = f"{current_note} | {coc_tag}".strip(" | ")

                update_payload = {
                    "ngay_coc_ve": target_date,
                    "ghi_chu_admin": new_note
                }
                patch_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?vin=eq.{clean_vin}"
                req_patch = urllib.request.Request(patch_url, data=json.dumps(update_payload).encode("utf-8"), headers=headers, method="PATCH")
                try:
                    with urllib.request.urlopen(req_patch, timeout=15) as _:
                        pass
                    updated_count += 1
                except Exception as pe:
                    logging.warning(f"Lỗi PATCH yeucauxhd cho VIN {clean_vin}: {pe}")

            # 3. Cập nhật donhang
            patch_dh_url = f"{SUPABASE_URL}/rest/v1/donhang?vin=eq.{clean_vin}"
            req_dh = urllib.request.Request(patch_dh_url, data=json.dumps({"ngay_coc_ve": target_date}).encode("utf-8"), headers=headers, method="PATCH")
            try:
                with urllib.request.urlopen(req_dh, timeout=15) as _:
                    pass
            except Exception:
                pass

            # 4. Cập nhật archived_orders
            patch_arc_url = f"{SUPABASE_URL}/rest/v1/archived_orders?vin=eq.{clean_vin}"
            req_arc = urllib.request.Request(patch_arc_url, data=json.dumps({"ngay_coc_ve": target_date}).encode("utf-8"), headers=headers, method="PATCH")
            try:
                with urllib.request.urlopen(req_arc, timeout=15) as _:
                    pass
            except Exception:
                pass

            # 5. Cập nhật khoxe
            patch_kho_url = f"{SUPABASE_URL}/rest/v1/khoxe?vin=eq.{clean_vin}"
            req_kho = urllib.request.Request(patch_kho_url, data=json.dumps({"ngay_coc_ve": target_date}).encode("utf-8"), headers=headers, method="PATCH")
            try:
                with urllib.request.urlopen(req_kho, timeout=15) as _:
                    pass
            except Exception:
                pass

            # 6. Bắn thông báo chuông cho TVBH và Admin (chỉ gửi nếu chưa từng gửi thông báo COC cho VIN này)
            if order_info:
                tvbh = (order_info.get("tvbh") or "").strip()
                cust_name = order_info.get("ten_khach_hang") or "Khách hàng"
                order_no = order_info.get("so_don_hang") or ""

                notif_msg = f"🚗 Xe VIN {clean_vin} (KH: {cust_name}) đã có giấy tờ COC về ngày {target_date}! Sẵn sàng bàn giao xe."

                if tvbh and tvbh not in notified_users:
                    # Kiểm tra xem TVBH đã nhận thông báo về xe này chưa
                    already_sent_tvbh = False
                    try:
                        chk_url = f"{SUPABASE_URL}/rest/v1/interactions?recipient=eq.{urllib.parse.quote(tvbh)}&metadata->>vin=eq.{clean_vin}&select=id"
                        chk_req = urllib.request.Request(chk_url, headers=headers, method="GET")
                        with urllib.request.urlopen(chk_req, timeout=10) as c_resp:
                            c_data = json.loads(c_resp.read().decode("utf-8"))
                            if c_data and len(c_data) > 0:
                                already_sent_tvbh = True
                    except Exception:
                        pass

                    if already_sent_tvbh:
                        logging.info(f"ℹ️ Bỏ qua gửi chuông cho TVBH {tvbh}: Đã có thông báo COC xe {clean_vin} từ trước.")
                    else:
                        notified_users.add(tvbh)
                        notif_body = {
                            "category": "NOTIFICATION",
                            "actor_id": "System",
                            "actor_name": "Zalo COC Watcher",
                            "recipient": tvbh,
                            "message": notif_msg,
                            "type": "success",
                            "target_view": "orders",
                            "target_id": order_no,
                            "is_read": False,
                            "metadata": {"vin": clean_vin, "ngay_coc_ve": target_date}
                        }
                        notif_url = f"{SUPABASE_URL}/rest/v1/interactions"
                        req_notif = urllib.request.Request(notif_url, data=json.dumps(notif_body).encode("utf-8"), headers=headers, method="POST")
                        try:
                            with urllib.request.urlopen(req_notif, timeout=15) as _:
                                pass
                        except Exception as ne:
                            logging.warning(f"Lỗi gửi thông báo cho TVBH {tvbh}: {ne}")

                # Bắn cho ADMINS (kiểm tra trùng lặp)
                already_sent_admin = False
                try:
                    chk_adm_url = f"{SUPABASE_URL}/rest/v1/interactions?recipient=eq.ADMINS&metadata->>vin=eq.{clean_vin}&select=id"
                    chk_adm_req = urllib.request.Request(chk_adm_url, headers=headers, method="GET")
                    with urllib.request.urlopen(chk_adm_req, timeout=10) as a_resp:
                        a_data = json.loads(a_resp.read().decode("utf-8"))
                        if a_data and len(a_data) > 0:
                            already_sent_admin = True
                except Exception:
                    pass

                if not already_sent_admin:
                    admin_notif_body = {
                        "category": "NOTIFICATION",
                        "actor_id": "System",
                        "actor_name": "Zalo COC Watcher",
                        "recipient": "ADMINS",
                        "message": f"📄 Giấy tờ COC xe {clean_vin} (Đơn {order_no}) đã về ngày {target_date}.",
                        "type": "info",
                        "target_view": "invoices",
                        "target_id": order_no,
                        "is_read": False,
                        "metadata": {"vin": clean_vin, "ngay_coc_ve": target_date}
                    }
                    notif_url = f"{SUPABASE_URL}/rest/v1/interactions"
                    req_admin_notif = urllib.request.Request(notif_url, data=json.dumps(admin_notif_body).encode("utf-8"), headers=headers, method="POST")
                    try:
                        with urllib.request.urlopen(req_admin_notif, timeout=15) as _:
                            pass
                    except Exception:
                        pass

        except Exception as e:
            logging.error(f"Lỗi cập nhật COC lên Supabase cho xe {vin}: {e}")

    logging.info(f"⚡ Đã đồng bộ COC vào Supabase cho {len(vins)} xe (Cập nhật khớp {updated_count} đơn hàng).")
    return {"updated": updated_count}


def get_zalo_send_date(image_path):
    """Lấy ngày gửi thực tế từ timestamp tên file Zalo (ví dụ 1791362214172 -> 07/10/2026)."""
    fn = os.path.basename(image_path)
    parts = fn.split("_")
    if len(parts) >= 1 and parts[0].isdigit() and len(parts[0]) >= 12:
        try:
            ts_ms = int(parts[0])
            dt = datetime.datetime.fromtimestamp(ts_ms / 1000.0)
            return dt.strftime("%d/%m/%Y")
        except Exception:
            pass

    # Nếu là ảnh từ Clipboard: Tìm file tương ứng trong thư mục Showroom Zalo (kể cả thư mục con Cache)
    try:
        if os.path.exists(image_path):
            with Image.open(image_path) as clip_img:
                target_w, target_h = clip_img.size
            search_dirs = list(SHOWROOM_GROUP_DIRS)
            if os.path.exists(ZALO_RESOURCE_DIR):
                for sd in os.listdir(ZALO_RESOURCE_DIR):
                    full_sd = os.path.join(ZALO_RESOURCE_DIR, sd)
                    if os.path.isdir(full_sd) and full_sd not in search_dirs:
                        search_dirs.append(full_sd)

            matches = []
            for d in search_dirs:
                if not os.path.exists(d):
                    continue
                for root, dirs, files in os.walk(d):
                    for f in files:
                        p = f.split("_")
                        if len(p) >= 1 and p[0].isdigit() and len(p[0]) >= 12:
                            ts_ms = int(p[0])
                            f_path = os.path.join(root, f)
                            try:
                                with Image.open(f_path) as ref_img:
                                    if ref_img.size == (target_w, target_h):
                                        dt = datetime.datetime.fromtimestamp(ts_ms / 1000.0)
                                        found_date = dt.strftime("%d/%m/%Y")
                                        matches.append((ts_ms, found_date, f))
                            except Exception:
                                pass
            if matches:
                matches.sort(key=lambda x: x[0], reverse=True)
                best_ts, best_date, best_file = matches[0]
                logging.info(f"🔍 Khớp ảnh Clipboard với file Zalo mới nhất: {best_file} -> Ngày gửi Zalo: {best_date}")
                return best_date
    except Exception as e:
        logging.warning(f"Lỗi tìm ngày Zalo gốc cho Clipboard: {e}")

    try:
        if os.path.exists(image_path):
            return datetime.datetime.fromtimestamp(os.path.getmtime(image_path)).strftime("%d/%m/%Y")
    except Exception:
        pass
    return datetime.datetime.now().strftime("%d/%m/%Y")


def process_coc_image(image_path, source_desc="Zalo"):
    """Xử lý phân tích và cập nhật COC cho 1 bức ảnh đã được lọc xác nhận."""
    logging.info(f"🚀 Gửi AI Gemini phân tích biên bản COC: {os.path.basename(image_path)} ({source_desc})")
    show_windows_notification("🚗 Zalo COC Watcher", f"🚀 Đang gửi AI Gemini phân tích ({source_desc})...")
    ai_data = call_gemini_scan(image_path)
    if not ai_data:
        logging.warning("⚠️ AI không nhận diện được dữ liệu biên bản.")
        show_windows_notification("🚗 Zalo COC Watcher", "⚠️ AI không phản hồi hoặc ảnh không đọc được nội dung biên bản.")
        return False

    cars = ai_data.get("danh_sach_xe", [])
    if cars and len(cars) > 0:
        vins = [c.get("so_khung", "").strip().upper() for c in cars if c.get("so_khung")]
        vins = [v for v in vins if len(v) >= 15]

        if vins:
            send_date = get_zalo_send_date(image_path)
            doc_date = ai_data.get("ngay_bien_ban", "")
            # Quy định nghiệp vụ: Ngày COC về là ngày ảnh được gửi lên Zalo (send_date), không phải ngày lập biên bản (doc_date)
            target_date = send_date if (send_date and len(send_date.strip()) >= 8) else datetime.datetime.now().strftime("%d/%m/%Y")
            logging.info(f"🎯 PHÁT HIỆN BIÊN BẢN COC! Ngày COC về (Zalo): {target_date} (Biên bản ghi: {doc_date}) | Số xe: {len(vins)}: {vins}")

            sheet_res = update_google_sheet_coc(vins, target_date)
            updated_count = sheet_res.get("updatedCount", 0) if sheet_res else 0

            # Đồng bộ trực tiếp vào đơn hàng trên ứng dụng Supabase
            sb_res = sync_coc_to_supabase_orders(vins, target_date)
            sb_updated = sb_res.get("updated", 0)

            msg = f"Đã nhận diện {len(vins)} xe từ {source_desc} (Ngày: {target_date}). Cập nhật Sổ Rút COC & note {sb_updated} đơn hàng trên ứng dụng!"
            logging.info(f"✅ {msg}")
            show_windows_notification("🚗 Zalo COC Auto Watcher", msg)
            return True
        else:
            logging.info("ℹ️ AI tìm thấy bảng nhưng không có số khung xe (VIN) hợp lệ (>= 15 ký tự).")
            show_windows_notification("🚗 Zalo COC Watcher", "AI đã phân tích ảnh: Không tìm thấy số khung hợp lệ.")
            return False
    else:
        logging.info("ℹ️ AI Gemini đã phân tích xong nhưng không tìm thấy danh sách xe trong ảnh.")
        show_windows_notification("🚗 Zalo COC Watcher", "AI đã phân tích ảnh: Không tìm thấy danh sách xe COC.")
        return False


def check_and_process_file(file_path):
    """Kiểm tra và xử lý một file ảnh mới xuất hiện trong nhóm Showroom."""
    processed = load_processed_files()
    if file_path in processed:
        return

    lower_fn = os.path.basename(file_path).lower()
    if not (lower_fn.endswith("_n") or lower_fn.endswith(".jpg") or lower_fn.endswith(".jpeg") or lower_fn.endswith(".png")):
        return

    # Chỉ xử lý ảnh mới tạo trong vòng 30 phút (tránh quét lại ảnh cũ, nhưng bắt kịp ảnh gửi trong lúc khởi động)
    try:
        mtime = os.path.getmtime(file_path)
        if (time.time() - mtime) > 1800:
            processed.add(file_path)
            save_processed_files(processed)
            return
    except Exception:
        return

    # Chờ Zalo ghi file xong nếu kích thước đang nhỏ
    sz = 0
    for _ in range(6):
        try:
            sz = os.path.getsize(file_path)
            if sz >= 35 * 1024:
                break
        except Exception:
            pass
        time.sleep(0.5)

    if sz < 35 * 1024:
        return  # File chưa ghi xong, không đánh dấu processed vội để event sau kiểm tra tiếp

    processed.add(file_path)
    save_processed_files(processed)

    logging.info(f"📸 PHÁT HIỆN ẢNH TRONG NHÓM SHOWROOM: {os.path.basename(file_path)} ({round(sz/1024)} KB)")

    # Chạy bộ lọc Windows OCR
    ocr_text = run_local_fast_ocr(file_path)
    is_coc, reason = has_coc_signals(ocr_text)

    if not is_coc:
        logging.info(f"⏭️ Bỏ qua ảnh thông thường ({reason}).")
        return

    logging.info(f"📄 BỘ LỌC XÁC NHẬN BIÊN BẢN COC: {reason}!")
    process_coc_image(file_path, "Nhóm Showroom")


class ShowroomGroupImageHandler(FileSystemEventHandler):
    """Lắng nghe cả sự kiện tạo ảnh mới (on_created) và ghi hoàn tất (on_modified) tại nhóm Showroom."""
    def on_created(self, event):
        if not event.is_directory:
            check_and_process_file(event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            check_and_process_file(event.src_path)


user32 = ctypes.windll.user32
user32.GetClipboardSequenceNumber.restype = ctypes.c_ulong
last_clipboard_seq = None
last_clipboard_hash = None
last_clipboard_time = 0


def check_clipboard():
    """Bắt tức thì sự kiện Sao chép ảnh bằng GetClipboardSequenceNumber của Windows (0.5s, 0% CPU)."""
    global last_clipboard_seq, last_clipboard_hash, last_clipboard_time
    try:
        seq = user32.GetClipboardSequenceNumber()
        if last_clipboard_seq == seq:
            return

        last_clipboard_seq = seq

        # Thử lấy dữ liệu từ Clipboard (chờ Zalo PC ghi ảnh bất đồng bộ xong trong tối đa 1.5s)
        img = None
        for attempt in range(6):
            time.sleep(0.25)
            try:
                img = ImageGrab.grabclipboard()
                if img is not None:
                    break
            except Exception:
                pass

        # Xử lý nếu bộ nhớ tạm là danh sách đường dẫn file (Zalo cache file không có đuôi .jpg thông thường)
        if isinstance(img, list) and len(img) > 0:
            for item in img:
                if isinstance(item, str) and os.path.exists(item):
                    try:
                        img = Image.open(item)
                        break
                    except Exception:
                        pass

        # Nếu Pillow không bắt được, dùng PowerShell worker (-Sta) làm fallback dự phòng 100%
        if not isinstance(img, Image.Image):
            try:
                ps_worker = os.path.join(SCRIPT_DIR, "get_clipboard_image.ps1")
                if os.path.exists(ps_worker):
                    res = subprocess.run(
                        ["powershell", "-NoProfile", "-Sta", "-ExecutionPolicy", "Bypass", "-File", ps_worker, "-OutPath", TEMP_CLIPBOARD_IMG],
                        capture_output=True, text=True, timeout=6, creationflags=0x08000000
                    )
                    if "OK:" in (res.stdout or "") and os.path.exists(TEMP_CLIPBOARD_IMG):
                        img = Image.open(TEMP_CLIPBOARD_IMG)
            except Exception as pe:
                logging.warning(f"Lỗi fallback PowerShell clipboard: {pe}")

        if not isinstance(img, Image.Image):
            logging.info(f"📋 Bắt sự kiện Clipboard ({seq}) nhưng không phải định dạng hình ảnh.")
            return

        w, h = img.size
        # Bỏ qua nếu là ảnh dải hẹp chụp màn hình terminal/thanh công cụ (tỷ lệ > 2.8 hoặc chiều cao < 200px)
        if (w > h and (w / h) > 2.8) or min(w, h) < 200:
            logging.info(f"⏭️ Bỏ qua ảnh chụp dải hẹp/thanh công cụ ({w}x{h}).")
            return

        img.convert("RGB").save(TEMP_CLIPBOARD_IMG, "JPEG", quality=92)

        # Kiểm tra mã băm để tránh quét lặp lại cùng một ảnh trong vòng 3 giây
        with open(TEMP_CLIPBOARD_IMG, "rb") as f:
            cur_hash = hashlib.md5(f.read()).hexdigest()
        now = time.time()
        if cur_hash == last_clipboard_hash and (now - last_clipboard_time) < 3:
            logging.info("⏭️ Bỏ qua ảnh: Thao tác copy lặp trong vòng 3 giây.")
            try:
                if os.path.exists(TEMP_CLIPBOARD_IMG):
                    os.remove(TEMP_CLIPBOARD_IMG)
            except Exception:
                pass
            return

        last_clipboard_hash = cur_hash
        last_clipboard_time = now

        logging.info(f"📋 BẮT ĐƯỢC ẢNH TỪ CLIPBOARD (Kích thước: {w}x{h})!")
        show_windows_notification("🚗 Zalo COC Watcher", f"📋 Đã nhận ảnh sao chép ({w}x{h})! Đang kiểm tra nội dung...")

        # Quét nhanh qua Windows OCR để kiểm tra nội dung văn bản
        ocr_text = run_local_fast_ocr(TEMP_CLIPBOARD_IMG)
        is_coc, reason = has_coc_signals(ocr_text)

        # BẮT BUỘC phải khớp từ khóa biên bản COC hoặc số khung xe
        if is_coc:
            logging.info(f"🚀 Gửi AI Gemini phân tích ảnh từ Clipboard ({reason})...")
            process_coc_image(TEMP_CLIPBOARD_IMG, "Clipboard (Ảnh sao chép)")
        else:
            logging.info(f"ℹ️ Ảnh Clipboard không phải biên bản COC ({reason}).")

        try:
            if os.path.exists(TEMP_CLIPBOARD_IMG):
                os.remove(TEMP_CLIPBOARD_IMG)
        except Exception:
            pass
    # Nếu sao chép text, link, file... (không phải ảnh): Bỏ qua âm thầm, không hiển thị cảnh báo gây phiền
    except Exception as e:
        logging.warning(f"Lỗi kiểm tra Clipboard: {e}")


def initial_sync_showroom_groups():
    """Kiểm tra ảnh mới trong 30 phút qua và đánh dấu ảnh cũ hơn là đã xử lý."""
    processed = load_processed_files()
    count_skipped = 0
    recent_files = []
    now = time.time()

    for d in SHOWROOM_GROUP_DIRS:
        if not os.path.exists(d):
            continue
        for root, dirs, files in os.walk(d):
            for fn in files:
                lower_fn = fn.lower()
                if lower_fn.endswith("_n") or lower_fn.endswith(".jpg") or lower_fn.endswith(".jpeg") or lower_fn.endswith(".png"):
                    fp = os.path.join(root, fn)
                    if fp not in processed:
                        try:
                            mtime = os.path.getmtime(fp)
                            if (now - mtime) <= 1800:
                                recent_files.append(fp)
                                continue
                        except Exception:
                            pass
                        processed.add(fp)
                        count_skipped += 1

    if count_skipped > 0:
        save_processed_files(processed)
    logging.info(f"Đã nạp và bỏ qua {count_skipped} ảnh lịch sử cũ.")

    if recent_files:
        logging.info(f"⚡ Phát hiện {len(recent_files)} ảnh trong 30 phút qua, đang kiểm tra...")
        for rf in recent_files:
            check_and_process_file(rf)


def main():
    logging.info("=== ĐÃ KHỞI ĐỘNG ZALO COC EVENT WATCHER ===")
    logging.info("📍 Theo dõi thời gian thực nhóm Showroom & Bắt ảnh Clipboard tức thì.")
    show_windows_notification("🚗 Zalo COC Watcher", "Hệ thống tự động theo dõi ảnh COC từ Zalo & Clipboard đã kích hoạt!")

    # 1. Đồng bộ ảnh ban đầu
    initial_sync_showroom_groups()

    # 2. Đăng ký Watchdog cho tất cả nhóm Showroom
    event_handler = ShowroomGroupImageHandler()
    observer = Observer()
    active_count = 0
    for d in SHOWROOM_GROUP_DIRS:
        if os.path.exists(d):
            observer.schedule(event_handler, d, recursive=True)
            active_count += 1
            logging.info(f"  + Đang lắng nghe: {os.path.basename(d)}")
    if active_count > 0:
        observer.start()
        logging.info("⚡ Watchdog lắng nghe sự kiện ảnh gửi vào nhóm Showroom đã sẵn sàng! CPU = 0.0%.")

    # 3. Lắng nghe Clipboard siêu tốc (mỗi 1.5s, dùng Pillow Native, 0% CPU)
    try:
        while True:
            check_clipboard()
            time.sleep(0.5)
    except KeyboardInterrupt:
        observer.stop()
    except Exception as e:
        logging.error(f"Lỗi main loop: {e}")
    finally:
        observer.stop()
        observer.join()
        if os.path.exists(PID_FILE):
            try:
                os.remove(PID_FILE)
            except Exception:
                pass


if __name__ == "__main__":
    main()
