import os
import time
from huggingface_hub import InferenceClient

HF_TOKEN = os.environ.get("HF_TOKEN", "")
MODEL = "black-forest-labs/FLUX.1-schnell"

# Thư mục lưu 6 file ảnh riêng lẻ
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "pictures", "hf_cat_6_keyframes")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 6 Keyframe chuyển động của chú mèo (Lựa chọn 1: Cute Gesture Cycle)
KEYFRAMES = [
    {
        "filename": "cat_kf1_sit_idle.png",
        "title": "Keyframe 1: Ngồi ngoan nhìn thẳng",
        "prompt": "photorealistic adorable fluffy British Shorthair cat sitting calmly looking forward at camera with big round glowing amber eyes, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k"
    },
    {
        "filename": "cat_kf2_tilt_head.png",
        "title": "Keyframe 2: Nghiêng đầu tò mò",
        "prompt": "photorealistic adorable fluffy British Shorthair cat sitting tilting head curiously to the right, big curious round eyes, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k"
    },
    {
        "filename": "cat_kf3_wave_paw.png",
        "title": "Keyframe 3: Giơ chân vẫy chào",
        "prompt": "photorealistic adorable fluffy British Shorthair cat sitting raising its front right paw waving hello cute gesture, soft pink paw pads visible, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k"
    },
    {
        "filename": "cat_kf4_meow_smile.png",
        "title": "Keyframe 4: Mở miệng meo meo / cười tươi",
        "prompt": "photorealistic adorable fluffy British Shorthair cat sitting with mouth open in a cute happy meow expression, whiskers twitching, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k"
    },
    {
        "filename": "cat_kf5_wink_tail.png",
        "title": "Keyframe 5: Nháy mắt tinh nghịch + ngoáy đuôi",
        "prompt": "photorealistic adorable fluffy British Shorthair cat sitting winking one eye playfully with fluffy tail swishing to the side, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k"
    },
    {
        "filename": "cat_kf6_return_idle.png",
        "title": "Keyframe 6: Hạ chân về vị trí nghỉ kết thúc chu kỳ",
        "prompt": "photorealistic adorable fluffy British Shorthair cat sitting lowering paws down gently back into neutral resting pose, looking at camera, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k"
    }
]

def main():
    print(f"🚀 Khởi tạo HuggingFace InferenceClient với model: {MODEL}...")
    client = InferenceClient(token=HF_TOKEN)

    for idx, kf in enumerate(KEYFRAMES, start=1):
        out_path = os.path.join(OUTPUT_DIR, kf["filename"])
        print(f"\n[{idx}/6] 🎨 Đang tạo: {kf['title']} ({kf['filename']})...")
        print(f"    Prompt: {kf['prompt'][:70]}...")

        try:
            image = client.text_to_image(
                prompt=kf["prompt"],
                model=MODEL,
                width=1024,
                height=1024
            )
            image.save(out_path)
            print(f"    ✅ Lưu thành công: {out_path} ({image.size[0]}x{image.size[1]})")
        except Exception as e:
            print(f"    ❌ Lỗi khi tạo frame {idx}: {e}")

        # Nghỉ nhẹ giữa các request để tránh rate limit
        time.sleep(1)

    print("\n🎉 ĐÃ TẠO XONG ĐẦY ĐỦ 6 HÌNH ẢNH KEYFRAME RIÊNG LẺ!")
    print(f"📂 Thư mục chứa ảnh: {os.path.abspath(OUTPUT_DIR)}")

if __name__ == "__main__":
    main()
