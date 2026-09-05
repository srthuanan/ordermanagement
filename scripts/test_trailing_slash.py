import requests
import json
import urllib.parse

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

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
