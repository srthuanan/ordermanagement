import requests

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

email = "nanajackychan@gmail.com"
redirect_to = "https://srthuanan.github.io/ordermanagement/"

payload = {
    "type": "recovery",
    "email": email,
    "options": {
        "redirectTo": redirect_to
    }
}

res = requests.post(f"{SUPABASE_URL}/auth/v1/admin/generate_link", headers=headers, json=payload)
print("Status:", res.status_code)
print("Response:", res.text)
