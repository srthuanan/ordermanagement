import urllib.request
import urllib.error
import json
import os

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
ANON_KEY = "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def test_supabase_write(key_name, api_key):
    print(f"\n--- TESTING WITH {key_name} ---")
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # 1. READ TEST
    read_url = f"{SUPABASE_URL}/rest/v1/khoxe?select=*&limit=1"
    req = urllib.request.Request(read_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"[READ] Success! Count retrieved: {len(data)}")
    except urllib.error.HTTPError as e:
        print(f"[READ] Error {e.code}: {e.read().decode()}")
        return
    except Exception as e:
        print(f"[READ] Exception: {e}")
        return

    # 2. INSERT TEST
    test_vin = "TESTVIN999999999"
    payload = json.dumps([{
        "vin": test_vin,
        "dong_xe": "VF 5",
        "phien_ban": "Plus",
        "ngoai_that": "Trắng",
        "noi_that": "Đen",
        "trang_thai": "Chưa ghép",
        "ngay_nhap": "2026-08-13T00:00:00Z"
    }]).encode('utf-8')

    insert_url = f"{SUPABASE_URL}/rest/v1/khoxe"
    req_insert = urllib.request.Request(insert_url, data=payload, headers=headers, method="POST")
    
    inserted_successfully = False
    try:
        with urllib.request.urlopen(req_insert) as resp:
            data = json.loads(resp.read().decode())
            print(f"[INSERT] SUCCESS! Data inserted into 'khoxe':")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            inserted_successfully = True
    except urllib.error.HTTPError as e:
        print(f"[INSERT] Error {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"[INSERT] Exception: {e}")

    # 3. CLEANUP TEST DATA IF INSERTED
    if inserted_successfully:
        delete_url = f"{SUPABASE_URL}/rest/v1/khoxe?vin=eq.{test_vin}"
        req_delete = urllib.request.Request(delete_url, headers=headers, method="DELETE")
        try:
            with urllib.request.urlopen(req_delete) as resp:
                print(f"[DELETE CLEANUP] Test record deleted successfully.")
        except Exception as e:
            print(f"[DELETE CLEANUP] Failed to delete test record: {e}")

if __name__ == "__main__":
    print("Checking Supabase DB write capabilities for table 'khoxe'...")
    test_supabase_write("SERVICE ROLE KEY", SERVICE_KEY)
    test_supabase_write("ANON KEY", ANON_KEY)
