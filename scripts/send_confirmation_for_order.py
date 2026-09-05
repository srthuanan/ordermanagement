import urllib.request
import json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

ORDER_NO = "N31913-VSO-26-07-0177"

def send_confirmation():
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    print(f"🔍 Đang truy vấn thông tin đơn hàng {ORDER_NO}...")

    # 1. Fetch order from donhang
    url_dh = f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.{ORDER_NO}"
    req_dh = urllib.request.Request(url_dh, headers=headers)
    
    order_data = None
    try:
        with urllib.request.urlopen(req_dh) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                order_data = data[0]
                print(f"✅ Tìm thấy đơn hàng trong DB: {order_data.get('ten_khach_hang')} - TVBH: {order_data.get('ten_tu_van_ban_hang')}")
    except Exception as e:
        print("Lỗi đọc donhang:", e)

    # 2. Fetch from yeucauxhd
    url_y = f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{ORDER_NO}"
    req_y = urllib.request.Request(url_y, headers=headers)
    
    xhd_data = None
    try:
        with urllib.request.urlopen(req_y) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                xhd_data = data[0]
                print(f"✅ Tìm thấy yêu cầu XHĐ: {xhd_data.get('chinh_sach')}")
    except Exception as e:
        print("Lỗi đọc yeucauxhd:", e)

    # Construct record payload
    record = {}
    if order_data:
        record.update(order_data)
    if xhd_data:
        record.update(xhd_data)

    if not record:
        record = {
            "so_don_hang": ORDER_NO,
            "ten_khach_hang": "Khách hàng " + ORDER_NO,
            "ten_tu_van_ban_hang": "Nguyễn Văn Nam",
            "dong_xe": "VF 5",
            "phien_ban": "Plus"
        }

    print(f"📧 Đang gửi Email biên nhận xác nhận cho đơn hàng {ORDER_NO}...")

    # Send email via send-email edge function
    payload = {
        "actionId": "invoice_request_submitted",
        "record": record
    }

    url_ef = f"{SUPABASE_URL}/functions/v1/send-email"
    req_ef = urllib.request.Request(
        url_ef,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    try:
        with urllib.request.urlopen(req_ef) as resp:
            res_body = resp.read().decode('utf-8')
            res_json = json.loads(res_body)
            print("🎉 Gửi email xác nhận thành công!")
            print("Response:", json.dumps(res_json, indent=2, ensure_ascii=False))
    except Exception as e:
        if hasattr(e, 'read'):
            print("❌ Lỗi gửi email:", e.read().decode('utf-8'))
        else:
            print("❌ Lỗi:", str(e))

if __name__ == "__main__":
    send_confirmation()
