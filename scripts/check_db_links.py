import requests

# Configuration
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
ORDER_NO = "N31913-VSO-26-03-0487"

def check_db_links(order_no):
    url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{order_no}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        records = response.json()
        if records:
            r = records[0]
            print(f"Links for {order_no}:")
            print(f"- HĐMB: {r.get('url_hop_dong')}")
            print(f"- ĐNXHĐ: {r.get('url_de_nghi_xhd')}")
            print(f"- Hóa đơn: {r.get('url_hoa_don_da_xuat')}")
        else:
            print("Không tìm thấy đơn hàng.")

if __name__ == "__main__":
    check_db_links(ORDER_NO)
