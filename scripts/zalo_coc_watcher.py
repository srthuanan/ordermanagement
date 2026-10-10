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
GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

COC_KEYWORDS = [
    "BIEN BAN", "BAN GIAO", "XUAT XUONG",
    "PHIEU KIEM TRA", "CHUNG NHAN XUAT XUONG", "GIAO NHAN", "CHUNG TU"
]

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


def update_google_sheet_coc(vins, receipt_date):
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
            // KHÔNG GHI ĐÈ nếu ô này đã có ngày COC về từ trước
            if (existingVal !== '') {{
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
            logging.info(f"🎯 PHÁT HIỆN BIÊN BẢN COC! Ngày biên bản: {doc_date} | Ngày gửi Zalo: {send_date} | Số xe: {len(vins)}: {vins}")

            target_date = doc_date if doc_date and len(doc_date.strip()) >= 8 else send_date
            sheet_res = update_google_sheet_coc(vins, target_date)
            updated_count = sheet_res.get("updatedCount", 0) if sheet_res else 0

            msg = f"Đã nhận diện {len(vins)} xe từ {source_desc} (Ngày: {target_date}). Khớp & cập nhật {updated_count} xe mới vào Sổ Rút COC!"
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

    # Chỉ xử lý ảnh mới tạo trong vòng 120 giây (tránh quét lại ảnh cũ trong lịch sử)
    try:
        mtime = os.path.getmtime(file_path)
        if (time.time() - mtime) > 120:
            processed.add(file_path)
            save_processed_files(processed)
            return
    except Exception:
        return

    # Chờ Zalo ghi file xong
    time.sleep(0.5)
    try:
        sz = os.path.getsize(file_path)
    except Exception:
        return

    if sz < 35 * 1024:
        processed.add(file_path)
        save_processed_files(processed)
        return

    logging.info(f"📸 PHÁT HIỆN ẢNH MỚI TRONG NHÓM SHOWROOM: {os.path.basename(file_path)} ({round(sz/1024)} KB)")
    processed.add(file_path)
    save_processed_files(processed)

    # Chạy bộ lọc Windows OCR
    ocr_text = run_local_fast_ocr(file_path)
    matched_kw = [kw for kw in COC_KEYWORDS if kw in ocr_text]

    if not matched_kw:
        logging.info(f"⏭️ Bỏ qua ảnh thông thường (không chứa từ khóa biên bản COC).")
        return

    logging.info(f"📄 BỘ LỌC XÁC NHẬN BIÊN BẢN COC: Khớp từ khóa {matched_kw}!")
    process_coc_image(file_path, "Nhóm Showroom")


class ShowroomGroupImageHandler(FileSystemEventHandler):
    """Lắng nghe duy nhất sự kiện tạo ảnh mới (on_created) trong thời gian thực tại các nhóm Showroom."""
    def on_created(self, event):
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
        if last_clipboard_seq is None:
            last_clipboard_seq = seq
            return
        if seq == last_clipboard_seq:
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

        # Xử lý nếu bộ nhớ tạm là danh sách đường dẫn file ảnh
        if isinstance(img, list) and len(img) > 0:
            for item in img:
                if isinstance(item, str) and item.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.jfif')):
                    try:
                        img = Image.open(item)
                        break
                    except Exception:
                        pass

        # Nếu Pillow không bắt được, dùng PowerShell worker làm fallback dự phòng 100%
        if not isinstance(img, Image.Image):
            try:
                ps_worker = os.path.join(SCRIPT_DIR, "get_clipboard_image.ps1")
                if os.path.exists(ps_worker):
                    res = subprocess.run(
                        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps_worker, "-OutPath", TEMP_CLIPBOARD_IMG],
                        capture_output=True, text=True, timeout=6, creationflags=0x08000000
                    )
                    if "OK:" in (res.stdout or "") and os.path.exists(TEMP_CLIPBOARD_IMG):
                        img = Image.open(TEMP_CLIPBOARD_IMG)
            except Exception:
                pass

        if isinstance(img, Image.Image):
            w, h = img.size
            # Bỏ qua nếu là ảnh dải hẹp chụp màn hình terminal/thanh công cụ (tỷ lệ > 2.8 hoặc chiều cao < 200px)
            if (w > h and (w / h) > 2.8) or min(w, h) < 200:
                return

            img.convert("RGB").save(TEMP_CLIPBOARD_IMG, "JPEG", quality=92)

            # Kiểm tra mã băm để tránh quét lặp lại 100% cùng một ảnh trong vòng 60 giây
            with open(TEMP_CLIPBOARD_IMG, "rb") as f:
                cur_hash = hashlib.md5(f.read()).hexdigest()
            now = time.time()
            if cur_hash == last_clipboard_hash and (now - last_clipboard_time) < 60:
                logging.info("⏭️ Bỏ qua ảnh: Trùng lặp hoàn toàn với ảnh vừa quét trước đó.")
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
            ocr_upper = ocr_text.upper()

            # Bỏ qua tuyệt đối nếu là ảnh chụp màn hình bảng tính, sổ theo dõi Google Sheet hoặc báo cáo
            table_ignore_markers = [
                "SO THEO DOI", "SỔ THEO DÕI", "RUT COC", "RÚT COC",
                "CHINH SACH", "CHÍNH SÁCH", "GIAI NGAN", "GIẢI NGÂN",
                "KHACH THANH TOAN", "KHÁCH THANH TOÁN", "NGAN HANG",
                "BANG TINH", "SPREADSHEET", "EXCEL", "SHOWROOM", "THUẬN AN - SỔ"
            ]
            if any(m in ocr_upper for m in table_ignore_markers):
                logging.info("⏭️ Bỏ qua ảnh Clipboard: Phát hiện ảnh chụp màn hình bảng tính/sổ theo dõi, không phải biên bản gốc.")
                return

            matched_kw = [kw for kw in COC_KEYWORDS if kw in ocr_upper]

            # BẮT BUỘC phải khớp từ khóa biên bản COC thực tế (Biên bản, Bàn giao, Xuất xưởng, Phiếu kiểm tra)
            if matched_kw:
                logging.info(f"🚀 Gửi AI Gemini phân tích ảnh từ Clipboard (Khớp: {matched_kw})...")
                process_coc_image(TEMP_CLIPBOARD_IMG, "Clipboard (Ảnh sao chép)")
            else:
                logging.info("ℹ️ Ảnh Clipboard không chứa từ khóa biên bản COC hợp lệ.")

            try:
                if os.path.exists(TEMP_CLIPBOARD_IMG):
                    os.remove(TEMP_CLIPBOARD_IMG)
            except Exception:
                pass
        # Nếu sao chép text, link, file... (không phải ảnh): Bỏ qua âm thầm, không hiển thị cảnh báo gây phiền
    except Exception as e:
        logging.warning(f"Lỗi kiểm tra Clipboard: {e}")


def initial_sync_showroom_groups():
    """Đánh dấu tất cả ảnh hiện có là đã xử lý để không quét lại ảnh cũ trong lịch sử."""
    processed = load_processed_files()
    count = 0
    for d in SHOWROOM_GROUP_DIRS:
        if not os.path.exists(d):
            continue
        for root, dirs, files in os.walk(d):
            for fn in files:
                lower_fn = fn.lower()
                if lower_fn.endswith("_n") or lower_fn.endswith(".jpg") or lower_fn.endswith(".jpeg") or lower_fn.endswith(".png"):
                    fp = os.path.join(root, fn)
                    if fp not in processed:
                        processed.add(fp)
                        count += 1
    if count > 0:
        save_processed_files(processed)
    logging.info(f"Đã nạp và bỏ qua {count} ảnh lịch sử. Chỉ lắng nghe sự kiện ảnh mới gửi hoặc ảnh copy.")


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
