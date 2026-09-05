import requests
import json
import unicodedata

url = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def norm_upper(s):
    if not s:
        return ""
    return unicodedata.normalize("NFC", s.strip().upper())

def main():
    # 1. Fetch Auth users
    res_auth = requests.get(f"{url}/auth/v1/admin/users", headers=headers)
    auth_users = res_auth.json().get("users", []) if res_auth.status_code == 200 else []
    auth_by_email = {u.get("email", "").strip().lower(): u for u in auth_users if u.get("email")}

    # 2. Fetch public.users
    res_db = requests.get(f"{url}/rest/v1/users?select=*", headers=headers)
    db_users = res_db.json() if res_db.status_code == 200 else []

    print("=== 1. SYNCING & CAPITALIZING EXISTING USERS ===")
    for u in db_users:
        uname = u["username"]
        raw_fn = u.get("full_name") or ""
        upper_fn = norm_upper(raw_fn)
        email = (u.get("email") or "").strip().lower()
        auth_u = auth_by_email.get(email)
        uid = auth_u.get("id") if auth_u else u.get("uid")
        
        update_data = {}
        if raw_fn != upper_fn:
            update_data["full_name"] = upper_fn
        if uid and u.get("uid") != uid:
            update_data["uid"] = uid
            
        if update_data:
            patch_res = requests.patch(f"{url}/rest/v1/users?username=eq.{uname}", headers=headers, json=update_data)
            print(f"Updated {uname}: {update_data} -> status {patch_res.status_code}")

    # 3. Add 4 new users
    new_personnel = [
        {
            "username": "haolt",
            "full_name": "TẠ THANH HẢO",
            "email": "tathanhhao0206@gmail.com",
            "role": "Tư vấn bán hàng",
            "manager_id": "phucnh"
        },
        {
            "username": "tranglth",
            "full_name": "LÊ THỊ HUYỀN TRANG",
            "email": "letrangvinfast@gmail.com",
            "role": "Tư vấn bán hàng",
            "manager_id": "phucnh"
        },
        {
            "username": "phatsm",
            "full_name": "SẨM MINH PHÁT",
            "email": "samminhphat188225@gmail.com",
            "role": "Tư vấn bán hàng",
            "manager_id": "phucnh"
        },
        {
            "username": "ngaltt",
            "full_name": "LÊ THỊ THÚY NGA",
            "email": "thuynga02.work@gmail.com",
            "role": "Tư vấn bán hàng",
            "manager_id": "phucnh"
        }
    ]

    print("\n=== 2. INSERTING NEW PERSONNEL ===")
    for p in new_personnel:
        em = p["email"].lower()
        auth_u = auth_by_email.get(em)
        uid = auth_u.get("id") if auth_u else None
        
        user_payload = {
            "username": p["username"],
            "full_name": norm_upper(p["full_name"]),
            "email": p["email"],
            "role": p["role"],
            "manager_id": p["manager_id"],
            "password_hash": "SUPABASE_AUTH_ONLY",
            "uid": uid
        }
        
        # Check if exists
        check = requests.get(f"{url}/rest/v1/users?username=eq.{p['username']}", headers=headers)
        if check.status_code == 200 and len(check.json()) > 0:
            res = requests.patch(f"{url}/rest/v1/users?username=eq.{p['username']}", headers=headers, json=user_payload)
            print(f"Updated existing {p['username']}: status {res.status_code}")
        else:
            res = requests.post(f"{url}/rest/v1/users", headers=headers, json=user_payload)
            print(f"Inserted new {p['username']} ({user_payload['full_name']}): status {res.status_code}")
            if res.status_code not in (200, 201):
                print("Error:", res.text)

    # 4. Sync Auth User Metadata (UPPERCASE) for ALL Auth users
    print("\n=== 3. UPDATING AUTH USER METADATA (UPPERCASE) ===")
    # Refresh public users
    res_db = requests.get(f"{url}/rest/v1/users?select=*", headers=headers)
    db_users = res_db.json() if res_db.status_code == 200 else []
    db_by_email = {u.get("email", "").strip().lower(): u for u in db_users if u.get("email")}

    for au in auth_users:
        em = (au.get("email") or "").strip().lower()
        uid = au.get("id")
        db_u = db_by_email.get(em)
        
        if db_u and uid:
            meta = au.get("user_metadata") or {}
            upper_name = norm_upper(db_u.get("full_name") or meta.get("full_name") or "")
            
            new_meta = {
                **meta,
                "full_name": upper_name,
                "name": upper_name,
                "username": db_u.get("username"),
                "role": db_u.get("role", "Tư vấn bán hàng"),
                "email_verified": True
            }
            
            try:
                res = requests.put(f"{url}/auth/v1/admin/users/{uid}", headers=headers, json={"user_metadata": new_meta}, timeout=5)
                print(f"Updated Auth metadata for {em} ({upper_name}) -> status {res.status_code}", flush=True)
            except Exception as ex:
                print(f"Failed Auth metadata for {em}: {ex}", flush=True)

    print("\n=== 4. FINAL VERIFICATION ===", flush=True)
    res_final = requests.get(f"{url}/rest/v1/users?select=username,full_name,email,role,manager_id,uid&order=full_name.asc", headers=headers, timeout=10)
    for u in res_final.json():
        print(f"{u['username']:<10} | {u['full_name']:<30} | {u.get('email', ''):<32} | {str(u.get('manager_id', '')):<8} | {str(u.get('uid', ''))}", flush=True)

if __name__ == "__main__":
    main()
