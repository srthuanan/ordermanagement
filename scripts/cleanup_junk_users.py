import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("VITE_SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

def cleanup():
    # List of junk usernames to remove
    junk_usernames = [
        "nanajackychan",
        "nanajackychan@gmail.com",
        "user",
        "test@vinfast.vn",
        "test",
        "demo"
    ]
    
    print(f"Starting cleanup for {len(junk_usernames)} junk accounts...")

    for username in junk_usernames:
        print(f"--- Processing: {username} ---")
        
        # 1. Delete from user_reputation_cache
        res1 = requests.delete(
            f"{SUPABASE_URL}/rest/v1/user_reputation_cache?username=eq.{username}",
            headers=headers
        )
        if res1.status_code in [200, 204]:
            print(f"  [OK] Deleted from user_reputation_cache")
        else:
            print(f"  [FAIL] Failed to delete from user_reputation_cache: {res1.text}")

        # 2. Delete from car_hold_activities
        # Note: We use username or tvbh_name depending on the table schema
        res2 = requests.delete(
            f"{SUPABASE_URL}/rest/v1/car_hold_activities?username=eq.{username}",
            headers=headers
        )
        res3 = requests.delete(
            f"{SUPABASE_URL}/rest/v1/car_hold_activities?tvbh_email=eq.{username}",
            headers=headers
        )
        if res2.status_code in [200, 204] or res3.status_code in [200, 204]:
            print(f"  [OK] Deleted from car_hold_activities")
        
        # 3. Delete from users table if it exists there
        res4 = requests.delete(
            f"{SUPABASE_URL}/rest/v1/users?username=eq.{username}",
            headers=headers
        )
        if res4.status_code in [200, 204]:
            print(f"  [OK] Deleted from users table")

    print("\nCleanup finished! Please refresh the Admin UI.")

if __name__ == "__main__":
    cleanup()
