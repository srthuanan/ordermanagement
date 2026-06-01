import requests
import os

url = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def get_unique_tvbh():
    active_users = set()
    
    # Check donhang
    res = requests.get(f"{url}/rest/v1/donhang?select=ten_tvbh&created_at=gte.2026-05-01T00:00:00", headers=headers)
    if res.status_code == 200:
        for r in res.json():
            if r.get("ten_tvbh"): active_users.add(r["ten_tvbh"])
            
    # Check yeucauvc
    res = requests.get(f"{url}/rest/v1/yeucauvc?select=ten_tvbh&created_at=gte.2026-05-01T00:00:00", headers=headers)
    if res.status_code == 200:
        for r in res.json():
            if r.get("ten_tvbh"): active_users.add(r["ten_tvbh"])
            
    # Check interactions
    res = requests.get(f"{url}/rest/v1/interactions?select=consultant_name,user_id&created_at=gte.2026-05-01T00:00:00", headers=headers)
    if res.status_code == 200:
        for r in res.json():
            if r.get("consultant_name"): active_users.add(r["consultant_name"])
            if r.get("user_id"): active_users.add(r["user_id"])

    return active_users

active = get_unique_tvbh()
print("Active users in May:", active)

known_users = [
    "PHẠM THÀNH NHÂN", "ĐINH TRỌNG NHÂN", "TẤT BÁCH TƯỜNG", "NGUYỄN TRẦN HOÀNG THANH",
    "NGUYỄN BẢO XUYÊN", "NGUYỄN THỊ DIỆN", "HUỲNH DIỆP THANH TRÂM", "NGUYỄN DƯ THUẬN",
    "THÀNH NGỌC VINH", "NGUYỄN THIÊN THẢO", "TRẦN DANH PHƯƠNG", "NGUYỄN HOÀNG PHÚC",
    "NGUYỄN THANH CẢ", "ĐÀO MINH KỲ", "PHẠM THỊ THÚY NGA", "NGUYỄN ANH TIẾN",
    "VÕ THẾ LÂN", "NGUYỄN THỊ YẾN VY", "NGUYỄN HOÀNG KHANG HUY", "TỐNG THÀNH ĐẠT",
    "TỐNG QUỐC THẮNG", "PHẠM TRỌNG HUY", "VĂN THỊ THANH DIỆU", "PHAN VĂN CƯỜNG",
    "HÀ HỮU HUY", "THÀNH NHÂN PHẠM"
]

missing = [u for u in active if u not in known_users]
print("Missing users:", missing)
