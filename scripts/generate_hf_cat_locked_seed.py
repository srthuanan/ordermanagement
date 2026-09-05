import os
import time
from huggingface_hub import InferenceClient

HF_TOKEN = os.environ.get("HF_TOKEN", "")
MODEL = "black-forest-labs/FLUX.1-schnell"
FIXED_SEED = 42

OUTPUT_DIR = r"C:\Users\USER\Documents\ordermanagement\public\assets\hf_cat_locked_seed"
os.makedirs(OUTPUT_DIR, exist_ok=True)

BASE_PROMPT = "photorealistic cute fluffy orange British Shorthair kitten, solid bright green screen background #00FF00, studio portrait, centered"

KEYFRAMES = [
    {
        "filename": "cat_kf1_sit_idle.png",
        "desc": "Frame 1: Ngồi nhìn thẳng vào camera",
        "prompt": f"{BASE_PROMPT}, sitting calmly looking directly at camera with round eyes, paws on floor"
    },
    {
        "filename": "cat_kf2_tilt_head.png",
        "desc": "Frame 2: Nghiêng đầu tò mò",
        "prompt": f"{BASE_PROMPT}, sitting tilting head curious to right side, paws on floor"
    },
    {
        "filename": "cat_kf3_wave_paw.png",
        "desc": "Frame 3: Giơ một bàn chân mèo vẫy chào",
        "prompt": f"{BASE_PROMPT}, sitting raising one front right cat paw waving hello"
    },
    {
        "filename": "cat_kf4_meow_smile.png",
        "desc": "Frame 4: Mở miệng meo meo vui vẻ",
        "prompt": f"{BASE_PROMPT}, sitting with mouth open in a happy meowing smile"
    },
    {
        "filename": "cat_kf5_wink_tail.png",
        "desc": "Frame 5: Nháy một mắt tinh nghịch",
        "prompt": f"{BASE_PROMPT}, sitting playfully winking one eye, happy expression"
    },
    {
        "filename": "cat_kf6_return_idle.png",
        "desc": "Frame 6: Hạ chân về vị trí nghỉ kết thúc chu kỳ",
        "prompt": f"{BASE_PROMPT}, sitting resting paws down on floor looking forward"
    }
]

def main():
    print(f"🚀 Bắt đầu tạo 6 Keyframe đồng bộ tuyệt đối với FLUX.1-schnell (Seed = {FIXED_SEED})...")
    client = InferenceClient(token=HF_TOKEN)

    for idx, kf in enumerate(KEYFRAMES, start=1):
        out_path = os.path.join(OUTPUT_DIR, kf["filename"])
        print(f"[{idx}/6] 🎨 Đang tạo: {kf['filename']}...")

        image = client.text_to_image(
            prompt=kf["prompt"],
            model=MODEL,
            seed=FIXED_SEED,
            width=512,
            height=512
        )
        image.save(out_path)
        print(f"  -> ✅ Đã lưu: {out_path}")
        time.sleep(1)

    print(f"\n🎉 HOÀN THÀNH 100%! Đã lưu 6 ảnh vào: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
