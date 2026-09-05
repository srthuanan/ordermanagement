import urllib.request
import json

HF_TOKEN = os.environ.get("HF_TOKEN", "")

MODELS = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "stabilityai/stable-diffusion-3.5-large",
    "black-forest-labs/FLUX.1-dev",
    "ByteDance/SDXL-Lightning",
    "prompthero/openjourney",
    "CompVis/stable-diffusion-v1-4"
]

prompt = "adorable golden retriever puppy sitting looking forward on solid green screen background #00FF00"

for m in MODELS:
    url = f"https://router.huggingface.co/hf-inference/models/{m}"
    print(f"Testing {m}...")
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = json.dumps({"inputs": prompt}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = resp.read()
            print(f"SUCCESS with {m}! Size: {len(data)}")
            with open("public/assets/hf_puppy_kf1.png", "wb") as f:
                f.write(data)
            break
    except urllib.error.HTTPError as e:
        print(f"Failed {m} with HTTP {e.code}: {e.read().decode('utf-8', errors='ignore')}")
    except Exception as e:
        print(f"Failed {m}: {e}")
