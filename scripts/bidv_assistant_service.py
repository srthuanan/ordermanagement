"""
bidv_assistant_service.py - Trợ lý Tự Động Đối Soát Tiền BIDV & Báo Có cho Showroom
1. Nhận danh sách giao dịch từ Bookmarklet BIDV qua cổng cục bộ 28888.
2. Lắng nghe thông báo thời gian thực từ Zalo (Nhóm "KT SR THUẬN AN check tiền").
3. Tự động bóc tách tên khách / số tiền, đối soát ngay lập tức.
4. Tự động vẽ Giấy Báo Có chuẩn 100% y hệt mẫu thật và nạp thẳng vào Clipboard.
5. Bật thông báo Windows Toast để kế toán chỉ cần bấm Ctrl + V vào Zalo là gửi ngay!
"""

import os
import sys
import time
import json
import re
import unicodedata
import threading
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(SCRIPT_DIR, "bidv_transactions_cache.json")
LOGO_FILE = os.path.join(SCRIPT_DIR, "logo_exact.png")
TEMP_IMG = os.path.join(SCRIPT_DIR, "temp_baoco_auto.png")
LOG_FILE = os.path.join(SCRIPT_DIR, "bidv_assistant.log")

cached_transactions = []
seen_notification_ids = set()


def log(msg):
    t_str = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"{t_str} [INFO] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def load_cache():
    global cached_transactions
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cached_transactions = json.load(f)
                log(f"Đã nạp {len(cached_transactions)} giao dịch từ bộ nhớ đệm.")
        except Exception as e:
            log(f"Lỗi đọc cache: {e}")


def save_cache():
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cached_transactions, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi ghi cache: {e}")


def no_accent(s):
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace("đ", "d").replace("Đ", "D").lower()


def find_match(query):
    global cached_transactions
    if not cached_transactions:
        return None

    q_norm = no_accent(query)
    # Lấy các số xuất hiện trong câu hỏi (ví dụ: 468tr -> 468, 20tr -> 20)
    amt_matches = re.findall(r"(\d+[\d\.,]*)\s*(?:tr|trieu|k|vnd|d)?", q_norm)
    best_item = None
    max_score = 0

    ignore_words = {
        "da", "e", "nho", "c", "check", "giup", "em", "kh", "gn", "giai", "ngan",
        "vao", "bidv", "a", "xe", "tien", "chua", "chuyen", "khoan", "tai", "khoan",
        "stk", "chi", "xem", "ho", "voi", "nhe", "nha", "co", "hop", "dong"
    }

    words = [w for w in q_norm.split() if len(w) >= 2 and w not in ignore_words]

    for it in cached_transactions:
        desc_norm = no_accent(it.get("desc", ""))
        amt_clean = str(it.get("amount", "")).replace(",", "").replace(".", "")
        score = 0

        # Khớp số tiền
        for a in amt_matches:
            clean_a = a.replace(",", "").replace(".", "")
            if len(clean_a) >= 2 and (clean_a in amt_clean or amt_clean.startswith(clean_a)):
                score += 6

        # Khớp tên khách / nội dung
        for w in words:
            if w in desc_norm:
                score += 3

        if score > max_score and score >= 4:
            max_score = score
            best_item = it

    return best_item


def render_baoco_image(item, output_path):
    """Vẽ Giấy Báo Có chuẩn 100% từng pixel theo mẫu thật BIDV."""
    w, h = 943, 634
    im = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(im)

    # 1. Khung viền ngoài
    draw.rectangle([50, 48, 904, 605], outline="black", width=1)

    # 2. Logo BIDV chuẩn thật
    if os.path.exists(LOGO_FILE):
        try:
            logo = Image.open(LOGO_FILE)
            im.paste(logo, (92, 58))
        except Exception:
            pass

    # 3. Đường kẻ ngang dưới header
    draw.line([50, 150, 904, 150], fill="black", width=1)

    # Font chữ
    font_times = ImageFont.truetype("times.ttf", 13)
    font_times_14 = ImageFont.truetype("times.ttf", 14)
    font_times_bold = ImageFont.truetype("timesbd.ttf", 13)
    font_title = ImageFont.truetype("timesbd.ttf", 19)
    font_small = ImageFont.truetype("times.ttf", 11)

    # Tiêu đề & Ngày in
    draw.text((435, 78), "GIẤY BÁO CÓ", fill="black", font=font_title)
    now_str = time.strftime("%d/%m/%Y %H:%M:%S")
    draw.text((680, 126), f"Ngày in: {now_str}", fill="black", font=font_times)

    # 4. Phần thông tin tài khoản
    stk = item.get("stk", "8603427888")
    ten_tk = item.get("ten_tk", "CTTNHH MINH DAO PHAT")
    draw.text((101, 168), f"Số tài khoản {stk}", fill="black", font=font_times)
    draw.text((101, 189), f"Tên tài khoản {ten_tk}", fill="black", font=font_times)

    # Khung Kính gửi
    draw.rectangle([101, 209, 501, 272], outline="black", width=1)
    draw.text((107, 215), f"Kính gửi: {ten_tk}", fill="black", font=font_times_bold)

    # Bên phải
    draw.text((508, 168), "Số tài khoản cũ", fill="black", font=font_times)
    draw.text((508, 210), "Ngân hàng chúng tôi xin trân trọng thông báo: Tài", fill="black", font=font_times)
    draw.text((508, 230), "khoản của Quý khách hàng đã được ghi CÓ với nội", fill="black", font=font_times)
    draw.text((508, 250), "dung sau:", fill="black", font=font_times)

    # 5. Bảng chi tiết
    draw.rectangle([101, 286, 868, 541], outline="black", width=1)
    draw.line([101, 319, 868, 319], fill="black", width=1)
    draw.line([203, 286, 203, 541], fill="black", width=1)
    draw.line([421, 286, 421, 541], fill="black", width=1)
    draw.line([501, 286, 501, 541], fill="black", width=1)

    # Tiêu đề bảng
    draw.text((120, 296), "Ngày hiệu lực", fill="black", font=font_times_bold)
    draw.text((290, 296), "Số tiền", fill="black", font=font_times_bold)
    draw.text((440, 296), "Loại tiền", fill="black", font=font_times_bold)
    draw.text((660, 296), "Diễn giải", fill="black", font=font_times_bold)

    # Dữ liệu
    date_parts = str(item.get("date", "")).split(" ")
    if len(date_parts) >= 2:
        draw.text((124, 380), date_parts[0], fill="black", font=font_times_14)
        draw.text((129, 400), date_parts[1], fill="black", font=font_times_14)
    else:
        draw.text((124, 390), str(item.get("date", "")), fill="black", font=font_times_14)

    draw.text((276, 390), str(item.get("amount", "")), fill="black", font=font_times_14)
    draw.text((450, 390), "VND", fill="black", font=font_times_14)

    # Wrap diễn giải
    desc = item.get("desc", "")
    words = desc.split()
    desc_lines = []
    cur_line = ""
    for w in words:
        test = (cur_line + " " + w).strip()
        if len(test) < 38:
            cur_line = test
        else:
            desc_lines.append(cur_line)
            cur_line = w
    if cur_line:
        desc_lines.append(cur_line)

    y_d = 360
    for dl in desc_lines:
        draw.text((508, y_d), dl, fill="black", font=font_times)
        y_d += 20

    # 6. Footer
    user_in = item.get("user_in", "5030641VANNT")
    draw.text((505, 568), f"Chứng từ được in từ chương trình BIDV iBank bởi user: {user_in}", fill="black", font=font_small)

    im.save(output_path, "PNG")
    return output_path


def copy_image_to_clipboard(img_path):
    """Nạp ảnh vào Clipboard bằng PowerShell."""
    try:
        clean_path = img_path.replace("\\", "\\\\")
        ps = f"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('{clean_path}'))"
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], timeout=5, creationflags=0x08000000)
        return True
    except Exception as e:
        log(f"Lỗi nạp ảnh Clipboard: {e}")
        return False


def show_toast(title, message):
    """Hiện thông báo Windows Toast."""
    try:
        clean_title = title.replace("'", "''")
        clean_msg = message.replace("'", "''")
        ps = f"""
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        $template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
        $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template)
        $textNodes = $xml.GetElementsByTagName('text')
        $textNodes.Item(0).AppendChild($xml.CreateTextNode('{clean_title}')) | Out-Null
        $textNodes.Item(1).AppendChild($xml.CreateTextNode('{clean_msg}')) | Out-Null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('BIDV Assistant').Show($toast)
        """
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], timeout=5, creationflags=0x08000000)
    except Exception as e:
        log(f"Lỗi hiện Toast: {e}")


# --- HTTP Server nhận đồng bộ từ Bookmarklet ---
class SyncHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_POST(self):
        global cached_transactions
        if self.path == "/sync":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                if isinstance(data, list) and len(data) > 0:
                    cached_transactions = data
                    save_cache()
                    log(f"⚡ Đã đồng bộ {len(data)} giao dịch mới nhất từ BIDV iBank!")
            except Exception as e:
                log(f"Lỗi parse dữ liệu sync: {e}")

            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"OK"}')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def start_http_server():
    server = HTTPServer(("127.0.0.1", 28888), SyncHandler)
    log("🚀 HTTP Server lắng nghe đồng bộ BIDV tại http://127.0.0.1:28888")
    server.serve_forever()


# --- Worker lắng nghe thông báo Zalo qua PowerShell ---
def notification_listener_worker():
    log("👂 Bắt đầu lắng nghe thông báo từ Zalo trong thời gian thực...")
    ps_script = os.path.join(SCRIPT_DIR, "scratch", "listen_zalo_toasts.ps1")
    if not os.path.exists(ps_script):
        ps_script = os.path.join(SCRIPT_DIR, "listen_zalo_toasts.ps1")

    while True:
        try:
            cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps_script]
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0  # SW_HIDE
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL,
                text=True,
                bufsize=1,
                encoding="utf-8",
                creationflags=0x08000000,  # CREATE_NO_WINDOW
                startupinfo=startupinfo
            )
            for line in proc.stdout:
                line = line.strip()
                if line.startswith("ZALO_MSG:"):
                    msg_body = line[len("ZALO_MSG:"):].strip()
                    log(f"📩 BẮT ĐƯỢC TIN NHẮN TỪ ZALO: {msg_body}")
                    handle_zalo_message(msg_body)
            proc.wait()
        except Exception as e:
            log(f"Lỗi worker thông báo: {e}")
        time.sleep(3)


def handle_zalo_message(text):
    # Kiểm tra xem có phải tin nhắn hỏi check tiền không
    keywords = ["check", "gn", "giai ngan", "coc", "tien", "stk", "bidv", "chuyen", "da vao"]
    text_norm = no_accent(text)
    if not any(k in text_norm for k in keywords):
        return

    log(f"🔍 Phát hiện yêu cầu check tiền từ TVBH: '{text}' -> Đang đối soát BIDV...")
    matched = find_match(text)
    if matched:
        amt = matched.get("amount", "")
        desc = matched.get("desc", "")
        log(f"🎯 TÌM THẤY GIAO DỊCH KHỚP! Số tiền: +{amt} VND | Nội dung: {desc}")

        # Vẽ ảnh Báo Có
        render_baoco_image(matched, TEMP_IMG)

        # Chép ảnh vào Clipboard
        copy_image_to_clipboard(TEMP_IMG)

        # Bật Toast thông báo
        short_desc = desc[:70] + "..." if len(desc) > 70 else desc
        show_toast("🎉 ĐÃ TÌM THẤY TIỀN VỀ BIDV!", f"+{amt} VND | {short_desc}\n👉 Đã nạp ảnh Báo Có vào Clipboard! Bấm Ctrl + V vào Zalo để gửi!")
        log("✅ Đã nạp ảnh Giấy Báo Có vào Clipboard và bắn thông báo Windows!")
    else:
        log("ℹ️ Đã đối soát nhưng chưa tìm thấy giao dịch nào khớp với yêu cầu.")


def main():
    log("=== KHỞI ĐỘNG TRỢ LÝ TỰ ĐỘNG BÁO TIỀN BIDV ➔ ZALO ===")
    load_cache()

    # Chạy HTTP Server nhận đồng bộ
    t_server = threading.Thread(target=start_http_server, daemon=True)
    t_server.start()

    # Chạy Worker lắng nghe thông báo Zalo
    t_notif = threading.Thread(target=notification_listener_worker, daemon=True)
    t_notif.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log("Đã dừng dịch vụ.")


if __name__ == "__main__":
    main()
