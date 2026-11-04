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

print(f"--- 1. Testing generate_link with type='recovery' for {email} ---")
payload = {
    "type": "recovery",
    "email": email,
    "options": {
        "redirectTo": redirect_to
    }
}

res = requests.post(f"{SUPABASE_URL}/auth/v1/admin/generate_link", headers=headers, json=payload)
print("Status Code:", res.status_code)
data = res.json()
print("Response Data:", json.dumps(data, indent=2))

action_link = data.get("properties", {}).get("action_link")
print("\nGenerated Action Link:", action_link)

if action_link:
    print("\n--- 2. Simulating User Clicking Action Link in Browser ---")
    # Make request to action_link without following redirects to see 302 location
    s = requests.Session()
    r = s.get(action_link, allow_redirects=False)
    print("Verification Endpoint Status:", r.status_code)
    print("Redirect Location Header:", r.headers.get("Location"))
    
    # If redirect location has hash fragment:
    # Note: HTTP Location header includes hash fragment if server set it
    loc = r.headers.get("Location")
    if loc:
        print("Redirect Target URL:", loc)
        parsed = urllib.parse.urlparse(loc)
        print("Path:", parsed.path)
        print("Fragment (Hash):", parsed.fragment)
