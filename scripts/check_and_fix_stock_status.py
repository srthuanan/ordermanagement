import urllib.request
import json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def fetch_data(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def update_car_status(vin, status, holder=None):
    url = f"{SUPABASE_URL}/rest/v1/khoxe?vin=eq.{vin}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload = {"trang_thai": status}
    if holder:
        payload["nguoi_giu_xe"] = holder
        payload["thoi_gian_het_han_giu"] = "Vô thời hạn"
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='PATCH')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("🔍 Đang kiểm tra dữ liệu kho xe và đơn hàng...")
    stock = fetch_data("khoxe?select=*")
    orders = fetch_data("donhang?select=so_don_hang,vin,ket_qua,ten_tu_van_ban_hang")
    
    print(f"Tổng số xe trong kho: {len(stock)}")
    print(f"Tổng số đơn hàng: {len(orders)}")
    
    # Map active order VINs -> order info
    active_matched = {}
    for o in orders:
        vin = o.get("vin")
        ket_qua = o.get("ket_qua") or ""
        if vin and not ket_qua.lower().startswith("đã hủy"):
            active_matched[vin] = o
            
    mismatches = []
    for car in stock:
        vin = car.get("vin")
        trang_thai = car.get("trang_thai")
        if vin in active_matched and trang_thai != "Đã ghép":
            order_info = active_matched[vin]
            mismatches.append({
                "vin": vin,
                "current_stock_status": trang_thai,
                "order": order_info["so_don_hang"],
                "tvbh": order_info.get("ten_tu_van_ban_hang")
            })
            
    print(f"\n⚠️ Phát hiện {len(mismatches)} xe đã ghép đơn hàng nhưng kho vẫn báo '{[m['current_stock_status'] for m in mismatches]}':")
    for m in mismatches:
        print(f"  - VIN: {m['vin']} | Đơn hàng: {m['order']} | Trạng thái hiện tại trong kho: '{m['current_stock_status']}' | TVBH: {m['tvbh']}")
        
    if mismatches:
        print("\n🛠️ Đang tự động sửa lại trạng thái các xe này thành 'Đã ghép'...")
        for m in mismatches:
            update_car_status(m["vin"], "Đã ghép", m["tvbh"])
            print(f"  ✅ Đã cập nhật VIN {m['vin']} -> 'Đã ghép'")

if __name__ == "__main__":
    main()
