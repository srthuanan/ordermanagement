import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

def main():
    print("--- FETCHING USERS ---")
    url = f"{SUPABASE_URL}/rest/v1/users?select=username,full_name,is_blocked"
    r = requests.get(url, headers=get_headers())
    users = r.json()
    print(f"Total entries in 'users' table: {len(users)}")
    for u in users:
        print(f"Username: '{u['username']}', Name: {u['full_name']}")

    print("\n--- FETCHING CACHE ---")
    url = f"{SUPABASE_URL}/rest/v1/user_reputation_cache?select=username,score,is_champion"
    r = requests.get(url, headers=get_headers())
    cache = r.json()
    print(f"Total entries in 'user_reputation_cache': {len(cache)}")
    for c in cache:
        print(f"Username: '{c['username']}', Score: {c['score']}%, Champion: {c['is_champion']}")

if __name__ == "__main__":
    main()
