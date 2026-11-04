import os
from dotenv import load_dotenv
load_dotenv()
import requests

url = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
key = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

usernames_to_delete = ["haolt", "tranglth", "ngaltt", "phatsm"]

for uname in usernames_to_delete:
    res = requests.delete(f"{url}/rest/v1/users?username=eq.{uname}", headers=headers)
    print(f"Deleting user '{uname}': status {res.status_code}")

