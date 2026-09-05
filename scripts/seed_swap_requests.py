import requests
import json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def create_mock_swap_requests():
    print("🔍 Fetching orders from table donhang to generate matching swap mock data...")
    res = requests.get(f"{SUPABASE_URL}/rest/v1/donhang?select=so_don_hang,ten_khach_hang,ten_tu_van_ban_hang,dong_xe,phien_ban,ngoai_that,noi_that,vin&limit=50", headers=headers)
    if res.status_code != 200:
        print(f"❌ Error fetching orders: {res.status_code} - {res.text}")
        return

    orders = res.json()
    print(f"Found {len(orders)} total orders.")

    # Find pairs of orders with matching configuration
    pairs = []
    for i in range(len(orders)):
        for j in range(i + 1, len(orders)):
            oA = orders[i]
            oB = orders[j]
            if (oA.get('dong_xe') == oB.get('dong_xe') and 
                oA.get('phien_ban') == oB.get('phien_ban') and 
                oA.get('ngoai_that') == oB.get('ngoai_that') and 
                oA.get('noi_that') == oB.get('noi_that')):
                pairs.append((oA, oB))

    print(f"Found {len(pairs)} matching order pairs with 100% config match!")

    mock_pairs = pairs[:4] if len(pairs) >= 4 else pairs

    mock_requests = []
    
    # 1. Request status: waiting_admin (Chờ Admin Phê Duyệt)
    pair1 = mock_pairs[0]
    r1_reason = "Khách hàng cần giao xe gấp trong tuần để chạy khai trương, hỗ trợ tráo VIN cùng cấu hình."
    mock_requests.append({
        "type": "WAITING_ADMIN",
        "category": "SWAP_CAR",
        "message": f"[SWAP_REQUEST] Yêu cầu đổi xe cho đơn {pair1[0].get('so_don_hang')}: {r1_reason}",
        "actor_id": "tvbh_01",
        "actor_name": pair1[0].get("ten_tu_van_ban_hang") or "TVBH Đề Nghị",
        "recipient": pair1[1].get("ten_tu_van_ban_hang") or "TVBH Sở Hữu Xe",
        "target_id": pair1[0].get("so_don_hang"),
        "target_view": pair1[1].get("vin") or "RLNV5JSE8TH803888",
        "metadata": {
            "orderA": pair1[0].get("so_don_hang"),
            "vinA": pair1[0].get("vin") or "Chưa ghép VIN",
            "tvbhA": pair1[0].get("ten_tu_van_ban_hang"),
            "orderB": pair1[1].get("so_don_hang"),
            "vinB": pair1[1].get("vin") or "RLNV5JSE8TH803888",
            "tvbhB": pair1[1].get("ten_tu_van_ban_hang"),
            "config": {
                "dong_xe": pair1[0].get("dong_xe") or "VF 5 Plus",
                "phien_ban": pair1[0].get("phien_ban") or "Plus",
                "ngoai_that": pair1[0].get("ngoai_that") or "Brahminy White",
                "noi_that": pair1[0].get("noi_that") or "Black"
            },
            "reason": r1_reason,
            "status": "waiting_admin"
        }
    })

    # 2. Request status: pending_tvbh2 (Chờ TVBH 2 Phản Hồi)
    if len(mock_pairs) > 1:
        pair2 = mock_pairs[1]
        r2_reason = "Đề xuất hoán đổi xe hỗ trợ tiến độ giao xe cho khách hàng khu vực miền Nam."
        mock_requests.append({
            "type": "SWAP_REQUEST",
            "category": "SWAP_CAR",
            "message": f"[SWAP_REQUEST] Yêu cầu đổi xe cho đơn {pair2[0].get('so_don_hang')}: {r2_reason}",
            "actor_id": "tvbh_02",
            "actor_name": pair2[0].get("ten_tu_van_ban_hang") or "TVBH A",
            "recipient": pair2[1].get("ten_tu_van_ban_hang") or "TVBH B",
            "target_id": pair2[0].get("so_don_hang"),
            "target_view": pair2[1].get("vin") or "RLNVBL9K9TT732651",
            "metadata": {
                "orderA": pair2[0].get("so_don_hang"),
                "vinA": pair2[0].get("vin") or "Chưa ghép VIN",
                "tvbhA": pair2[0].get("ten_tu_van_ban_hang"),
                "orderB": pair2[1].get("so_don_hang"),
                "vinB": pair2[1].get("vin") or "RLNVBL9K9TT732651",
                "tvbhB": pair2[1].get("ten_tu_van_ban_hang"),
                "config": {
                    "dong_xe": pair2[0].get("dong_xe") or "VF 3 Plus",
                    "phien_ban": pair2[0].get("phien_ban") or "Plus",
                    "ngoai_that": pair2[0].get("ngoai_that") or "Brahminy White",
                    "noi_that": pair2[0].get("noi_that") or "Black"
                },
                "reason": r2_reason,
                "status": "pending_tvbh2"
            }
        })

    # 3. Request status: approved (Đã Phê Duyệt)
    if len(mock_pairs) > 2:
        pair3 = mock_pairs[2]
        r3_reason = "Admin đã điều phối tráo VIN trực tiếp thành công."
        mock_requests.append({
            "type": "ADMIN_APPROVED",
            "category": "SWAP_CAR",
            "message": f"[SWAP_REQUEST] Admin phê duyệt tráo xe cho đơn {pair3[0].get('so_don_hang')}: {r3_reason}",
            "actor_id": "admin",
            "actor_name": "Admin Showroom",
            "recipient": pair3[1].get("ten_tu_van_ban_hang") or "TVBH 2",
            "target_id": pair3[0].get("so_don_hang"),
            "target_view": pair3[1].get("vin") or "RLNVNM54TT705323",
            "metadata": {
                "orderA": pair3[0].get("so_don_hang"),
                "vinA": pair3[0].get("vin") or "Chưa ghép VIN",
                "tvbhA": pair3[0].get("ten_tu_van_ban_hang"),
                "orderB": pair3[1].get("so_don_hang"),
                "vinB": pair3[1].get("vin") or "RLNVNM54TT705323",
                "tvbhB": pair3[1].get("ten_tu_van_ban_hang"),
                "config": {
                    "dong_xe": pair3[0].get("dong_xe") or "VF 5 Plus",
                    "phien_ban": pair3[0].get("phien_ban") or "Plus",
                    "ngoai_that": pair3[0].get("ngoai_that") or "Jet Black",
                    "noi_that": pair3[0].get("noi_that") or "Black"
                },
                "reason": r3_reason,
                "status": "approved"
            }
        })

    # Insert into Supabase interactions table
    url = f"{SUPABASE_URL}/rest/v1/interactions"
    ins_res = requests.post(url, headers=headers, json=mock_requests)
    
    if ins_res.status_code in [200, 201]:
        print(f"✅ Successfully inserted {len(mock_requests)} mock swap requests into table interactions!")
    else:
        print(f"❌ Error inserting mock data: {ins_res.status_code} - {ins_res.text}")

if __name__ == "__main__":
    create_mock_swap_requests()
