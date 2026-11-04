import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Vui lòng cài đặt Pillow bằng lệnh: pip install Pillow")
    sys.exit(1)

folder = r"c:\Users\USER\Documents\ordermanagement\public\pictures"
target_size = (500, 400)

count = 0
for filename in os.listdir(folder):
    if filename.startswith("vf2-") and filename.endswith(".png"):
        filepath = os.path.join(folder, filename)
        try:
            with Image.open(filepath) as img:
                # Dùng ImageOps.fit để cắt và resize vừa đúng 500x400 (chỉnh giữa)
                new_img = ImageOps.fit(img, target_size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
                new_img.save(filepath, format="PNG")
                print(f"Đã xử lý: {filename}")
                count += 1
        except Exception as e:
            print(f"Lỗi khi xử lý {filename}: {e}")

print(f"\nHoàn tất! Đã resize {count} ảnh VF2.")
