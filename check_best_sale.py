import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
    }

def main():
    print("=" * 60)
    print("📊 BẢNG VÀNG KẾT QUẢ BÁN HÀNG THÁNG 03/2026")
    print("=" * 60)
    
    # Lấy các xe đã xuất hóa đơn trong tháng 3
    # format: 2026-03-01T00:00:00+07:00
    query_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?select=tvbh,ngay_xuat_hoa_don&ngay_xuat_hoa_don=gte.2026-03-01&ngay_xuat_hoa_don=lt.2026-04-01"
    
    try:
        resp = requests.get(query_url, headers=get_headers())
        if resp.status_code != 200:
            print(f"Lỗi truy vấn: {resp.text}")
            return
            
        data = resp.json()
        
        if not data:
            print("Không tìm thấy dữ liệu xuất hóa đơn nào trong tháng 3/2026!")
            return

        # Thống kê
        stats = {}
        for order in data:
            tvbh = order.get('tvbh', 'Chưa rõ TVBH').strip()
            stats[tvbh] = stats.get(tvbh, 0) + 1
            
        # Sắp xếp
        sorted_stats = sorted(stats.items(), key=lambda x: x[1], reverse=True)

        print(f"Tổng số xe đã xuất hóa đơn: {len(data)} xe\n")
        print("{:<30} | {:<10}".format("Tư vấn bán hàng", "Số lượng"))
        print("-" * 45)
        for name, count in sorted_stats:
            print("{:<30} | {:<10} xe".format(name, count))
        
        print("\n" + "=" * 60)
        best_sale = sorted_stats[0][0]
        max_cars = sorted_stats[0][1]
        print(f"🏆 BEST SALE THÁNG 03/2026 QUYẾT LIỆT NHẤT LÀ: \n⭐️ {best_sale.upper()} (với {max_cars} xe)")
        print("=" * 60)

    except Exception as e:
        print(f"Lỗi hệ thống: {str(e)}")

if __name__ == "__main__":
    main()
