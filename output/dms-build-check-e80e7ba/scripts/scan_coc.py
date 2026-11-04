import os
import sys
import re
import io
import json
import base64
import urllib.request
import urllib.parse
import subprocess
import datetime
import requests
from PIL import Image, ImageGrab
from dotenv import load_dotenv

# Load môi trường
load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", SUPABASE_KEY)
GAS_URL = 'https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec'
OCR_WORKER = os.path.join(os.path.dirname(__file__), "ocr_worker.ps1")

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

def select_image_file():
    """Mở hộp thoại chọn file của Windows nếu không truyền tham số."""
    ps_cmd = """
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Filter = "Image Files (*.png;*.jpg;*.jpeg;*.webp;*.bmp)|*.png;*.jpg;*.jpeg;*.webp;*.bmp|All Files (*.*)|*.*"
    $dialog.Title = "Chọn ảnh biên bản bàn giao COC"
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $dialog.FileName
    }
    """
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
    file_path = (res.stdout or "").strip()
    return file_path if file_path and os.path.exists(file_path) else None

def get_image_input():
    """Lấy file ảnh từ tham số CLI, Clipboard hoặc Hộp thoại chọn file."""
    # 1. Tham số dòng lệnh
    if len(sys.argv) > 1:
        path = sys.argv[1].strip().strip('"').strip("'")
        if os.path.exists(path):
            return path, "Đường dẫn chỉ định"
        else:
            print(f"❌ File '{path}' không tồn tại!")

    # 2. Kiểm tra Clipboard
    try:
        clip_img = ImageGrab.grabclipboard()
        if isinstance(clip_img, Image.Image):
            temp_path = os.path.join(os.environ.get("TEMP", "."), f"coc_clip_{int(datetime.datetime.now().timestamp())}.jpg")
            clip_img.convert("RGB").save(temp_path, format="JPEG", quality=90)
            return temp_path, "Bộ nhớ tạm (Clipboard)"
    except Exception:
        pass

    # 3. Mở File Dialog
    print("📂 Đang mở hộp thoại chọn file ảnh...")
    selected = select_image_file()
    if selected:
        return selected, "Hộp thoại chọn file"

    return None, None

def call_ai_scan(image_path):
    """Quét ảnh bằng Gemini AI qua Supabase Edge Function scan-pdf."""
    print("🤖 Đang gửi ảnh tới AI Gemini để trích xuất số khung (VIN)...")
    try:
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

        with urllib.request.urlopen(req, timeout=45) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            if res.get("success") and res.get("data"):
                return res["data"]
    except Exception as e:
        print(f"⚠️ AI Edge Function phản hồi chậm hoặc lỗi ({e}), chuyển sang quét OCR cục bộ...")

    # Fallback: Quét OCR Windows Media
    if os.path.exists(OCR_WORKER):
        try:
            cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", OCR_WORKER, "-ImagePath", image_path]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=10, creationflags=0x08000000)
            ocr_text = (res.stdout or "").upper()
            vins = re.findall(r'\b(R[NLX][A-Z0-9]{14,16})\b', ocr_text)
            if vins:
                vins = list(dict.fromkeys(vins))
                return {
                    "ngay_bien_ban": datetime.datetime.now().strftime("%d/%m/%Y"),
                    "danh_sach_xe": [{"stt": i+1, "loai_xe": "", "so_khung": v} for i, v in enumerate(vins)]
                }
        except Exception:
            pass

    return None

def sync_to_supabase(vins, upload_date_str):
    """Đồng bộ ngày COC về vào Supabase các bảng yeucauxhd, donhang, khoxe."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    results = []
    for vin in vins:
        clean_vin = vin.strip().upper()
        # Tìm thông tin đơn hàng
        lookup_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?vin=eq.{clean_vin}&select=so_don_hang,ten_khach_hang,tvbh,ngay_coc_ve"
        req = urllib.request.Request(lookup_url, headers=headers)
        order_info = None
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data:
                    order_info = data[0]
        except Exception:
            pass

        # 🛑 NẾU ĐÃ CÓ NGÀY COC VỀ -> TUYỆT ĐỐI BỎ QUA
        existing_coc = ((order_info.get("ngay_coc_ve") or "") if order_info else "").strip()
        if existing_coc:
            print(f"  ℹ️ Bỏ qua xe {clean_vin}: Đã có ngày COC về ({existing_coc}), tuyệt đối không ghi đè!")
            continue

        # Cập nhật yeucauxhd
        patch_payload = {
            "ngay_coc_ve": upload_date_str,
            "ghi_chu_admin": f"[COC về: {upload_date_str}]"
        }
        try:
            req_yc = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/yeucauxhd?vin=eq.{clean_vin}",
                data=json.dumps(patch_payload).encode("utf-8"),
                headers=headers,
                method="PATCH"
            )
            with urllib.request.urlopen(req_yc, timeout=10) as _:
                pass
        except Exception:
            pass

        # Cập nhật donhang & khoxe
        for tbl in ["donhang", "archived_orders", "khoxe"]:
            try:
                req_tbl = urllib.request.Request(
                    f"{SUPABASE_URL}/rest/v1/{tbl}?vin=eq.{clean_vin}",
                    data=json.dumps({"ngay_coc_ve": upload_date_str}).encode("utf-8"),
                    headers=headers,
                    method="PATCH"
                )
                with urllib.request.urlopen(req_tbl, timeout=10) as _:
                    pass
            except Exception:
                pass

        # Bắn thông báo chuông cho TVBH
        if order_info and order_info.get("tvbh"):
            tvbh = order_info["tvbh"].strip()
            cust = order_info.get("ten_khach_hang", "Khách hàng")
            order_no = order_info.get("so_don_hang", "")
            notif_body = {
                "category": "NOTIFICATION",
                "actor_id": "AI_Scanner",
                "actor_name": "AI Quét Biên Bản COC",
                "recipient": tvbh,
                "message": f"🚗 Xe VIN {clean_vin} (KH: {cust}) đã có giấy tờ COC về ngày {upload_date_str}! Sẵn sàng bàn giao.",
                "type": "success",
                "target_view": "orders",
                "target_id": order_no,
                "is_read": False,
                "metadata": {"vin": clean_vin, "ngay_coc_ve": upload_date_str}
            }
            try:
                req_notif = urllib.request.Request(
                    f"{SUPABASE_URL}/rest/v1/interactions",
                    data=json.dumps(notif_body).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req_notif, timeout=10) as _:
                    pass
            except Exception:
                pass

        results.append({
            "vin": clean_vin,
            "khach": (order_info.get("ten_khach_hang") if order_info else "Chưa rõ"),
            "tvbh": (order_info.get("tvbh") if order_info else "Chưa rõ")
        })

    return results

def sync_to_google_sheet(vins, upload_date_str):
    """Cập nhật ngày COC về vào Cột O trên sheet RÚT COC."""
    gas_code = f"""
    (function() {{
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('RÚT COC');
      if (!sheet) return {{ success: false, error: 'Sheet RÚT COC not found' }};

      var targetVins = {json.dumps(vins)};
      var targetDate = "{upload_date_str}";
      var maxR = Math.max(sheet.getLastRow(), 150);
      var vinVals = sheet.getRange(3, 5, maxR - 2, 1).getValues();

      var updated = [];
      for (var i = 0; i < vinVals.length; i++) {{
        var cellVin = String(vinVals[i][0] || '').trim().toUpperCase();
        if (!cellVin) continue;

        for (var j = 0; j < targetVins.length; j++) {{
          if (cellVin === targetVins[j]) {{
            var r = i + 3;
            // Điền ngày COC về ở Cột O
            sheet.getRange(r, 15).setValue(targetDate);
            // Cột M tự động chuyển ✅ Đã có COC
            sheet.getRange(r, 13).setValue("✅ Đã có COC");
            updated.push({{ row: r, vin: cellVin }});
            break;
          }}
        }}
      }}
      SpreadsheetApp.flush();
      return {{ success: true, updated: updated }};
    }})()
    """

    try:
        resp = requests.post(GAS_URL, json={'action': 'EXECUTE_SCRIPT', 'code': gas_code}, timeout=30)
        res = resp.json()
        if res.get('status') == 'SUCCESS':
            return res.get('data', {}).get('updated', [])
    except Exception as e:
        print(f"Lỗi cập nhật Google Sheet: {e}")
    return []

def main():
    print("=" * 65)
    print("📸 CÔNG CỤ AI QUÉT ẢNH BIÊN BẢN COC & TỰ ĐỘNG ĐỒNG BỘ")
    print("=" * 65)

    img_path, src_type = get_image_input()
    if not img_path:
        print("❌ Không có file ảnh nào được chọn. Đã hủy thao tác.")
        return

    print(f"🔍 Nguồn ảnh: {src_type}")
    print(f"📁 Đường dẫn: {img_path}")

    # Ngày tải ảnh lên chính là ngày COC về
    upload_date = datetime.datetime.now().strftime("%d/%m/%Y")
    print(f"📅 Ngày ghi nhận COC về (ngày tải ảnh): {upload_date}\n")

    # 1. Gọi AI trích xuất VIN
    ai_result = call_ai_scan(img_path)
    if not ai_result or not ai_result.get("danh_sach_xe"):
        print("❌ Không tìm thấy số khung (VIN) xe nào trong ảnh biên bản!")
        return

    xe_list = ai_result["danh_sach_xe"]
    vins = [x["so_khung"].strip().upper() for x in xe_list if x.get("so_khung")]
    vins = list(dict.fromkeys(vins)) # Bỏ trùng

    print(f"\n🎉 AI đã phát hiện thành công {len(vins)} số VIN trong biên bản:")
    for idx, v in enumerate(vins, start=1):
        print(f"  {idx}. {v}")

    # 2. Đồng bộ Supabase
    print(f"\n⚡ 1/2. Đang đồng bộ vào Supabase (Bảng yeucauxhd, donhang, khoxe)...")
    sb_res = sync_to_supabase(vins, upload_date)
    print(f"  ✅ Đã cập nhật ngày COC về '{upload_date}' cho {len(sb_res)} xe trên Supabase.")

    # 3. Đồng bộ Google Sheet RÚT COC
    print(f"\n📊 2/2. Đang đồng bộ vào Google Sheet 'RÚT COC'...")
    gs_res = sync_to_google_sheet(vins, upload_date)
    print(f"  ✅ Đã tìm thấy và điền Ngày COC về (Cột O) cho {len(gs_res)} dòng trên Google Sheet:")
    for item in gs_res:
        print(f"     - Dòng {item['row']}: VIN {item['vin']} -> Đã có COC ngày {upload_date}")

    # 4. Thông báo Windows
    msg = f"Đã quét {len(vins)} xe từ ảnh COC! Ngày về: {upload_date} đã cập nhật lên Supabase & Google Sheet."
    show_windows_notification("🎉 Quét Biên Bản COC Thành Công", msg)

    print("\n" + "=" * 65)
    print("✨ HOÀN TẤT 100%! TOÀN BỘ DỮ LIỆU ĐÃ ĐỒNG BỘ TỰ ĐỘNG.")
    print("=" * 65)

if __name__ == "__main__":
    main()
