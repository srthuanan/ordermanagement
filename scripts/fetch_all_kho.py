import requests
import json
import os
import csv

API_URL = "https://script.google.com/macros/s/AKfycbylEAT8IqQVmKsulKUB5imIUcWm3h7a6Mfe-MQyhF3T5Wu2JWcbO3Q6a1aXZLN7exnV/exec"

def fetch_all():
    print(f"--- Đang gọi API đồng bộ 3 kho xe ---")
    res = requests.get(API_URL, allow_redirects=True, timeout=90)
    print(f"HTTP Status: {res.status_code}")
    
    if res.status_code != 200:
        print("Lỗi kết nối API:", res.text[:500])
        return

    result = res.json()
    if result.get("status") != "SUCCESS":
        print("Lỗi từ Google Apps Script:", result.get("message"))
        return

    os.makedirs("scratch", exist_ok=True)
    
    warehouses = result.get("warehouses", {})
    total_all_cars = 0
    thuan_an_cars = 0
    
    summary_report = []

    for kho_key, kho_info in warehouses.items():
        kho_name = kho_info.get("khoName")
        if "error" in kho_info:
            print(f"\n❌ {kho_name}: Lỗi - {kho_info['error']}")
            continue
            
        data = kho_info.get("data", [])
        total_rows = len(data)
        sheet_name = kho_info.get("sheetName")
        print(f"\n==========================================")
        print(f"🏢 {kho_name} (Sheet: '{sheet_name}')")
        print(f"- Tổng số dòng: {total_rows}")
        
        # Lưu file CSV cho từng kho
        csv_file = f"scratch/kho_{kho_key}.csv"
        with open(csv_file, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            for row in data:
                writer.writerow(row)
        print(f"- Đã lưu file: {csv_file}")
        
        # Thống kê chi tiết
        if len(data) > 1:
            header = data[0]
            rows = data[1:]
            cars_in_kho = len(rows)
            total_all_cars += cars_in_kho
            
            # Đếm xe của Thuận An
            # Cột Showroom Quản lý ở index 3
            ta_rows = []
            for r in rows:
                sr_val = str(r[3]).lower() if len(r) > 3 else ""
                if "thuận an" in sr_val or "thuan an" in sr_val:
                    ta_rows.append(r)
                    
            thuan_an_cars += len(ta_rows)
            print(f"- Tổng số xe theo dõi: {cars_in_kho} xe")
            print(f"- Xe của riêng Thuận An: {len(ta_rows)} xe")
            
            summary_report.append({
                "kho": kho_name,
                "sheet": sheet_name,
                "total": cars_in_kho,
                "thuan_an": len(ta_rows)
            })

    # Lưu toàn bộ dữ liệu tổng hợp
    all_json_path = "scratch/all_3_kho_xe.json"
    with open(all_json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n==========================================")
    print(f"✅ ĐÃ ĐỒNG BỘ HOÀN TẤT CẢ 3 KHO! Đã lưu: {all_json_path}")
    print(f"📊 BẢNG TỔNG KẾT:")
    for rep in summary_report:
        print(f"  + {rep['kho']} (Sheet: '{rep['sheet']}'): Tổng {rep['total']} xe | Thuận An: {rep['thuan_an']} xe")
    print(f"\n👉 TỔNG CỘNG 3 KHO: {total_all_cars} xe (Trong đó Thuận An: {thuan_an_cars} xe)")

if __name__ == "__main__":
    fetch_all()
