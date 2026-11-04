import requests
import json
import os
import csv

API_URL = "https://script.google.com/macros/s/AKfycbyznKAqWN5ny8oGnMyrFPPxPgYRDwldRmCBqrsU9s0oAR0cpHqOFuO2sKUuZjQCdjSH/exec"

def main():
    print(f"--- Đang gọi API Kho Xe Quận 12 ---")
    res = requests.get(API_URL, allow_redirects=True, timeout=60)
    print(f"HTTP Status: {res.status_code}")
    
    if res.status_code != 200:
        print("Lỗi kết nối API:", res.text[:500])
        return

    data = res.json()
    if data.get("status") != "SUCCESS":
        print("Lỗi từ Google Apps Script:", data.get("message"))
        return

    sheet_name = data.get("sheetName")
    total_rows = data.get("totalRows")
    raw_data = data.get("data", [])
    
    print(f"✅ THÀNH CÔNG RỰC RỠ!")
    print(f"- Tên Tab: {sheet_name}")
    print(f"- Tổng số dòng: {total_rows}")
    
    # Lưu JSON
    os.makedirs("scratch", exist_ok=True)
    json_path = "scratch/kho_xe_quan_12.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"- Đã lưu JSON tại: {json_path}")
    
    # Lưu CSV
    csv_path = "scratch/kho_xe_quan_12.csv"
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        for row in raw_data:
            writer.writerow(row)
    print(f"- Đã lưu CSV tại: {csv_path}")
    
    # Hiển thị tiêu đề & 5 dòng đầu
    print("\n--- 5 DÒNG DỮ LIỆU ĐẦU TIÊN ---")
    for i, r in enumerate(raw_data[:6]):
        print(f"Dòng {i}: {r[:12]}")

if __name__ == "__main__":
    main()
