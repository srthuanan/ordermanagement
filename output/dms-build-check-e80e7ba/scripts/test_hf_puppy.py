import os
import urllib.request
import json

HF_TOKEN = os.environ.get("HF_TOKEN", "")

MODELS = [
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
    "https://api-inference.huggingface.co/models/segmind/SSD-1B"
]

prompt = "adorable golden retriever puppy sitting looking forward on solid green screen background #00FF00, studio lighting, 8k"

for url in MODELS:
    print(f"Testing URL: {url}...")
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = json.dumps({"inputs": prompt}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            print(f"SUCCESS with {url}! Output bytes: {len(data)}")
            with open("public/assets/hf_puppy_test.png", "wb") as f:
                f.write(data)
            break
    except Exception as e:
        print(f"Failed {url}: {e}")
