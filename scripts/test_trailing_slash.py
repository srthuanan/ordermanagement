import os
from dotenv import load_dotenv
load_dotenv()
import requests
import json
import urllib.parse

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SERVICE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

email = "nanajackychan@gmail.com"
redirect_to = "https://srthuanan.github.io/ordermanagement/"

print("=== Calling generate_link (type='recovery') with trailing slash ===")
payload = {
    "type": "recovery",
    "email": email,
    "options": {
        "redirectTo": redirect_to
    }
}
res = requests.post(f"{SUPABASE_URL}/auth/v1/admin/generate_link", headers=headers, json=payload)
data = res.json()
action_link = data.get("action_link")
print("Action Link:", action_link)

r = requests.get(action_link, allow_redirects=False)
print("Verify HTTP Status:", r.status_code)
print("Verify Location Header:", r.headers.get("Location"))
