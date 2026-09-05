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

print("=== STEP 1: Calling generate_link (type='invite') ===")
payload_invite = {
    "type": "invite",
    "email": email,
    "options": {
        "redirectTo": redirect_to
    }
}
res_invite = requests.post(f"{SUPABASE_URL}/auth/v1/admin/generate_link", headers=headers, json=payload_invite)
print("Invite Status:", res_invite.status_code)
print("Invite Body:", res_invite.text[:300])

print("\n=== STEP 2: Calling generate_link (type='recovery') ===")
payload_recovery = {
    "type": "recovery",
    "email": email,
    "options": {
        "redirectTo": redirect_to
    }
}
res_recovery = requests.post(f"{SUPABASE_URL}/auth/v1/admin/generate_link", headers=headers, json=payload_recovery)
print("Recovery Status:", res_recovery.status_code)
rec_data = res_recovery.json()
print("Recovery Keys:", list(rec_data.keys()) if isinstance(rec_data, dict) else rec_data)

action_link = rec_data.get("action_link")
print("Action Link:", action_link)

if action_link:
    print("\n=== STEP 3: Requesting Action Link ===")
    s = requests.Session()
    r = s.get(action_link, allow_redirects=False)
    print("Verify HTTP Status:", r.status_code)
    print("Verify Location Header:", r.headers.get("Location"))
    
    loc = r.headers.get("Location")
    if loc:
        parsed = urllib.parse.urlparse(loc)
        print("Redirect Scheme + Netloc + Path:", f"{parsed.scheme}://{parsed.netloc}{parsed.path}")
        print("Redirect Fragment:", parsed.fragment)
