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

# Normalize string helper
def norm(s):
    if not s: return ""
    return unicodedata.normalize('NFC', s.strip().upper())

# Structure from user's image:
# Leader -> list of members
teams_def = {
    "TẤT BÁCH TƯỜNG": [
        "PHẠM TRỌNG HUY",
        "NGUYỄN TRẦN HOÀNG THANH",
        "TỐNG THÀNH ĐẠT",
        "HUỲNH DIỆP THANH TRÂM",
        "PHAN VĂN CƯỜNG",
        "LÊ THỊ HƯƠNG TRÀ",
        "HÀ HỮU HUY",
        "NGUYỄN VĂN NGHĨA",
        "NGUYỄN BÁ DŨNG"
    ],
    "ĐINH TRỌNG NHÂN": [
        "THÀNH NGỌC VINH",
        "NGUYỄN THIỆN THẢO",
        "NGUYỄN ANH TIẾN",
        "VỐ THẾ LÂN", # could be VÕ THẾ LÂN
        "VÕ THẾ LÂN",
        "PHẠM THỊ THÚY NGA",
        "NGUYỄN THỊ YẾN VY",
        "NGUYỄN HOÀNG KHANG HUY",
        "NGUYỄN THANH CẢ",
        "TRẦN DANH PHƯƠNG"
    ],
    "NGUYỄN HOÀNG PHÚC": [
        "PHẠM KHÁNH DUY",
        "NGUYỄN DƯ THUẬN",
        "ĐÀO MINH KÝ",
        "LÊ THANH HẢO",
        "LÊ THỊ HUYỀN TRANG",
        "LÊ THỊ THÚY NGA",
        "SẨM MINH PHÁT"
    ]
}

def main():
    res = requests.get(f"{url}/rest/v1/users?select=username,full_name,role,manager_id", headers=headers)
    if res.status_code != 200:
        print("Failed to fetch users:", res.status_code, res.text)
        return
    
    users = res.json()
    print(f"Total users in DB: {len(users)}")
    
    db_name_to_user = {}
    for u in users:
        fn = norm(u.get('full_name'))
        db_name_to_user[fn] = u
        
    print("\n--- Match Leaders ---")
    leader_username_map = {}
    for leader_name in teams_def.keys():
        matched = None
        for db_name, u in db_name_to_user.items():
            if norm(leader_name) == db_name:
                matched = u
                break
        if matched:
            print(f"FOUND LEADER: {leader_name} -> username: {matched['username']}, current role: {matched.get('role')}")
            leader_username_map[leader_name] = matched['username']
        else:
            print(f"WARNING: Leader {leader_name} NOT FOUND in users table!")
            
    # Update leaders role to 'Trưởng Phòng Kinh Doanh'
    print("\n--- Updating Leader Roles ---")
    for leader_name, leader_username in leader_username_map.items():
        patch_res = requests.patch(
            f"{url}/rest/v1/users?username=eq.{leader_username}",
            headers=headers,
            json={"role": "Trưởng Phòng Kinh Doanh", "manager_id": None}
        )
        print(f"Updated leader {leader_name} ({leader_username}): status {patch_res.status_code}")

    # Update members manager_id
    print("\n--- Updating Members Manager ID ---")
    for leader_name, members in teams_def.items():
        leader_uname = leader_username_map.get(leader_name)
        if not leader_uname:
            print(f"Skipping members for {leader_name} as leader username is missing.")
            continue
            
        print(f"\nProcessing team for leader: {leader_name} (manager_id = {leader_uname})")
        for member_name in members:
            # find in DB
            matched_user = None
            for db_name, u in db_name_to_user.items():
                if norm(member_name) == db_name:
                    matched_user = u
                    break
            if matched_user:
                m_uname = matched_user['username']
                patch_res = requests.patch(
                    f"{url}/rest/v1/users?username=eq.{m_uname}",
                    headers=headers,
                    json={"manager_id": leader_uname, "role": "Tư vấn bán hàng"}
                )
                print(f"  [OK] Updated member {matched_user.get('full_name')} ({m_uname}) -> manager_id={leader_uname} (status: {patch_res.status_code})")
            else:
                print(f"  [MISSING] Member {member_name} NOT FOUND in users table!")

if __name__ == "__main__":
    main()
