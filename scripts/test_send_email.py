import requests
import json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
ANON_KEY = "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "actionId": "welcome_new_user",
    "record": {
        "email": "nanajackychan@gmail.com",
        "full_name": "QUÀNG THỊ MÉN",
        "role": "Tư vấn bán hàng",
        "redirectTo": "https://srthuanan.github.io/ordermanagement/"
    }
}

resp = requests.post(f"{SUPABASE_URL}/functions/v1/send-email", headers=headers, json=payload)
print("Response Status:", resp.status_code)
print("Response Body:", resp.text)
