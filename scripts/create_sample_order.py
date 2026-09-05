import urllib.request
import json
import datetime
import random

# Configuration
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def create_sample_order():
    random_id = random.randint(1000, 9999)
    so_don_hang = f"N31923-VS0-26-07-{random_id}"

    order_data = {
        "so_don_hang": so_don_hang,
        "ten_tu_van_ban_hang": "Nguyễn Văn Nam",
        "ten_khach_hang": f"Lê Hoàng Anh ({random_id})",
        "dong_xe": "VF 5",
        "phien_ban": "Plus",
        "ngoai_that": "Urbant Mint (CE1W)",
        "noi_that": "Black",
        "ngay_coc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "thoi_gian_nhap": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ket_qua": "Chưa ghép"
    }

    url = f"{SUPABASE_URL}/rest/v1/donhang"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(order_data).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            created = json.loads(res_body)
            print("✅ Đã tạo đơn hàng mẫu thành công!")
            print(json.dumps(created, indent=2, ensure_ascii=False))
            return created
    except Exception as e:
        if hasattr(e, 'read'):
            print("❌ Lỗi API:", e.read().decode('utf-8'))
        else:
            print("❌ Lỗi:", str(e))
        return None

if __name__ == "__main__":
    create_sample_order()
