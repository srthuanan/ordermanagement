import os
import time
from huggingface_hub import InferenceClient
from PIL import Image

HF_TOKEN = os.environ.get("HF_TOKEN", "")
MODEL = "black-forest-labs/FLUX.1-schnell"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "pictures", "hf_cat_spritesheet_consistent")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SPRITESHEET_PATH = os.path.join(OUTPUT_DIR, "cat_6_frames_spritesheet.png")

# Prompt yêu cầu AI vẽ lưới 2 hàng x 3 cột (hoặc 3x2) hiển thị cùng một con mèo
PROMPT = (
    "A photorealistic character model sheet grid of the exact same cute fluffy British Shorthair kitten in 6 different poses, "
    "2x3 grid layout, 6 clearly separated panels, consistent character design, identical orange brown fur and markings. "
    "Panel 1: sitting still looking forward. "
    "Panel 2: tilting head curiously. "
    "Panel 3: raising right front paw waving. "
    "Panel 4: opening mouth in a happy meow smile. "
    "Panel 5: playful winking one eye. "
    "Panel 6: lowering paws back to resting. "
    "Solid bright green screen background #00FF00, studio lighting, highly detailed, photorealistic 8k"
)

def main():
    print("🚀 Khởi tạo HuggingFace sinh Sprite Sheet 6 khung hình đồng bộ...")
    client = InferenceClient(token=HF_TOKEN)

    print("🎨 Đang yêu cầu AI FLUX vẽ 6 tư thế cùng 1 chú mèo trên 1 ảnh duy nhất...")
    image = client.text_to_image(
        prompt=PROMPT,
        model=MODEL,
        width=1024,
        height=1024
    )

    image.save(SPRITESHEET_PATH)
    print(f"✅ Đã lưu ảnh tổng Sprite Sheet: {SPRITESHEET_PATH}")

    # Tự động cắt lưới 2 hàng x 3 cột (hoặc lưu ảnh tổng để kiểm tra)
    w, h = image.size
    rows, cols = 2, 3
    tile_w = w // cols
    tile_h = h // rows

    frame_names = [
        "cat_kf1_sit_idle.png",
        "cat_kf2_tilt_head.png",
        "cat_kf3_wave_paw.png",
        "cat_kf4_meow_smile.png",
        "cat_kf5_wink_tail.png",
        "cat_kf6_return_idle.png"
    ]

    print("\n✂️ Đang tự động cắt 6 khung hình từ Sprite Sheet...")
    idx = 0
    for r in range(rows):
        for c in range(cols):
            if idx >= len(frame_names):
                break
            left = c * tile_w
            top = r * tile_h
            right = left + tile_w
            bottom = top + tile_h

            cropped = image.crop((left, top, right, bottom))
            out_file = os.path.join(OUTPUT_DIR, frame_names[idx])
            cropped.save(out_file)
            print(f"  -> Lưu [{idx+1}/6]: {frame_names[idx]} ({cropped.size[0]}x{cropped.size[1]})")
            idx += 1

    print("\n🎉 HOÀN TẤT CẮT 6 KHUNG HÌNH ĐỒNG BỘ!")
    print(f"📂 Thư mục chứa: {os.path.abspath(OUTPUT_DIR)}")

if __name__ == "__main__":
    main()
