import urllib.request
import json
import datetime

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def test_send_invoice_request_email():
    print("🚀 Đang kiểm tra Edge Function gửi Email biên nhận tiếp nhận XHĐ...")
    
    # Target Edge Function URL
    url = f"{SUPABASE_URL}/functions/v1/send-email"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    # Test payload mimicking invoice_request_submitted
    payload = {
        "actionId": "invoice_request_submitted",
        "recipient_email": "showroomthuanan@gmail.com",
        "record": {
            "so_don_hang": "TEST-XHĐ-001",
            "ten_khach_hang": "Nguyễn Văn Test Email",
            "ten_tu_van_ban_hang": "Nguyễn Văn Nam",
            "dong_xe": "VF 8",
            "phien_ban": "Plus",
            "ngoai_that": "Desat Silver",
            "noi_that": "Black",
            "vin": "VF8TEST123456789",
            "policy": "Chính sách ưu đãi tháng 7",
            "commission": "5000000",
            "vpoint": "200",
            "url_hop_dong": "https://jwvgxqrkjlbewvpkvucj.supabase.co/storage/v1/object/public/car-images/logoweb.png",
            "url_de_nghi_xhd": "https://jwvgxqrkjlbewvpkvucj.supabase.co/storage/v1/object/public/car-images/logoweb.png"
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            print("✅ Edge Function phản hồi thành công!")
            print("Response:", json.dumps(res_json, indent=2, ensure_ascii=False))
            print("👉 Email biên nhận tiếp nhận Yêu cầu xuất hóa đơn đã được gửi thành công đến SMTP/Gmail!")
            return True
    except Exception as e:
        if hasattr(e, 'read'):
            print("❌ Lỗi Edge Function:", e.read().decode('utf-8'))
        else:
            print("❌ Lỗi:", str(e))
        return False

if __name__ == "__main__":
    test_send_invoice_request_email()
