import requests

url = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

usernames_to_delete = ["haolt", "tranglth", "ngaltt", "phatsm"]

for uname in usernames_to_delete:
    res = requests.delete(f"{url}/rest/v1/users?username=eq.{uname}", headers=headers)
    print(f"Deleting user '{uname}': status {res.status_code}")

