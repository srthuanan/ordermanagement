import requests

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "")

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "actionId": "forgot_password_secure",
    "record": {
        "email": "thuynga02.work@gmail.com",
        "redirectTo": "https://srthuanan.github.io/ordermanagement/"
    }
}

resp = requests.post(f"{SUPABASE_URL}/functions/v1/send-email", headers=headers, json=payload)
print("Response Status:", resp.status_code)
print("Response Body:", resp.text)
