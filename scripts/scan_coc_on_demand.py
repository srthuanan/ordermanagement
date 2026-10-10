"""
scan_coc_on_demand.py - Công cụ quét biên bản bàn giao COC THEO YÊU CẦU (Chạy 1 lần rồi thoát)
Khi chạy:
1. Quét từ đường dẫn file nếu được truyền vào (sys.argv[1]).
2. Hoặc quét ảnh đang có trong Clipboard (vừa bấm "Sao chép ảnh").
3. Hoặc nếu Clipboard không có ảnh, quét ảnh mới nhất từ nhóm Zalo Showroom.
4. Tự động trích xuất số khung (VIN), ngày COC về, cập nhật Sổ RÚT COC & thông báo TVBH.
5. Kết thúc ngay sau khi hoàn thành (không chạy ngầm, không tự động lặp lại).
"""

import os
import sys
import datetime
import logging
from PIL import ImageGrab, Image

# Import toàn bộ hàm xử lý cốt lõi từ zalo_coc_watcher
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import zalo_coc_watcher as watcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

def run_on_demand():
    print("=" * 65)
    print("       CÔNG CỤ QUÉT BIÊN BẢN BÀN GIAO COC THEO YÊU CẦU")
    print("=" * 65)
    
    target_img_path = None
    source_name = ""

    # 1. Kiểm tra tham số dòng lệnh (nếu truyền file cụ thể)
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        target_img_path = sys.argv[1]
        source_name = f"File chỉ định: {os.path.basename(target_img_path)}"
        print(f">> Nguồn: {source_name}")

    # 2. Nếu không có file chỉ định, kiểm tra Clipboard
    if not target_img_path:
        print(">> Đang kiểm tra bộ nhớ tạm (Clipboard)...")
        img = None
        try:
            img = ImageGrab.grabclipboard()
        except Exception as e:
            print(f"   Lỗi đọc Clipboard: {e}")

        if isinstance(img, list) and len(img) > 0:
            for item in img:
                if isinstance(item, str) and os.path.exists(item):
                    try:
                        img = Image.open(item)
                        break
                    except Exception:
                        pass

        if img is not None and hasattr(img, 'save'):
            temp_path = os.path.join(SCRIPT_DIR, "clipboard_manual_scan.jpg")
            try:
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                img.save(temp_path, "JPEG", quality=95)
                target_img_path = temp_path
                source_name = "Ảnh từ Clipboard (Sao chép hình ảnh)"
                print(f"✅ Đã tìm thấy ảnh từ Clipboard (Kích thước: {img.size[0]}x{img.size[1]})")
            except Exception as e:
                print(f"❌ Không thể lưu ảnh từ Clipboard: {e}")

    # 3. Nếu Clipboard không có ảnh, tìm ảnh mới nhất từ nhóm Zalo Showroom
    if not target_img_path:
        print(">> Clipboard không có ảnh. Đang kiểm tra ảnh gửi gần nhất trong nhóm Zalo Showroom...")
        newest_file = None
        newest_mtime = 0
        
        for g_dir in watcher.SHOWROOM_GROUP_DIRS:
            if not os.path.exists(g_dir):
                continue
            for root, _, files in os.walk(g_dir):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        mt = os.path.getmtime(fp)
                        sz = os.path.getsize(fp)
                        # Chỉ lấy ảnh có dung lượng > 35KB
                        if mt > newest_mtime and sz > 35 * 1024:
                            newest_mtime = mt
                            newest_file = fp
                    except Exception:
                        pass

        if newest_file:
            mtime_dt = datetime.datetime.fromtimestamp(newest_mtime)
            print(f"✅ Tìm thấy ảnh mới nhất trong nhóm Zalo: {os.path.basename(newest_file)} (Thời gian: {mtime_dt.strftime('%d/%m/%Y %H:%M:%S')})")
            target_img_path = newest_file
            source_name = f"Ảnh mới nhất từ Zalo: {os.path.basename(newest_file)}"

    # 4. Nếu vẫn không có ảnh
    if not target_img_path:
        print("\n❌ KHÔNG TÌM THẤY ẢNH ĐỂ QUÉT!")
        print("💡 Hướng dẫn:")
        print("   - Cách 1: Trên Zalo, bấm chuột phải vào ảnh biên bản COC -> Chọn 'Sao chép hình ảnh' rồi chạy lại lệnh này.")
        print("   - Cách 2: Kéo thả file ảnh vào lệnh: python scripts/scan_coc_on_demand.py \"duong_dan_anh.jpg\"")
        return

    # 5. Tiến hành quét và xử lý
    print(f"\n🚀 Đang tiến hành quét và nhận diện COC từ: {source_name}...")
    try:
        success = watcher.process_coc_image(target_img_path, source_name)
        if success:
            print("\n🎉 HOÀN TẤT THÀNH CÔNG! Đã cập nhật COC và thông báo cho TVBH.")
        else:
            print("\n⚠️ Không phát hiện số khung hợp lệ hoặc ảnh không phải biên bản bàn giao COC.")
    except Exception as e:
        print(f"\n❌ Lỗi trong quá trình quét: {e}")

if __name__ == "__main__":
    run_on_demand()
