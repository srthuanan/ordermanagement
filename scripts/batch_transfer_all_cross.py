# -*- coding: utf-8 -*-
import sys
import os
import json
from collections import defaultdict
from datetime import datetime

# Đảm bảo import được module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.sync_thuan_an_allocations import (
    get_cross_showroom_allocations,
    transfer_business_location
)

def run_batch_transfer(from_date="2026-01-01"):
    print("=" * 80)
    print(f"🚀 BẮT ĐẦU ĐIỀU CHUYỂN ĐỊA ĐIỂM KINH DOANH CHO TOÀN BỘ XE TỪ {from_date}")
    print("=" * 80)

    # 1. Lấy toàn bộ xe chưa điều chuyển
    print(f"\n[1/3] Đang truy vấn danh sách xe phân bổ Thuận An đã xuất HĐ ở Showroom khác...")
    data = get_cross_showroom_allocations({"fromDate": from_date})
    all_cars = data.get("cars", [])
    pending_cars = [c for c in all_cars if not c.get("has_transferred")]

    print(f"  ➔ Tổng số xe tìm thấy: {len(all_cars)} xe")
    print(f"  ➔ Số xe CHƯA lập ĐNX điều chuyển cần xử lý: {len(pending_cars)} xe")

    if not pending_cars:
        print("\n✅ Tuyệt vời! Tất cả các xe đều đã có phiếu ĐNX điều chuyển địa điểm kinh doanh.")
        return

    # 2. Gom nhóm theo Showroom nhận (Mã TTCP xuất HĐ)
    sr_groups = defaultdict(list)
    for c in pending_cars:
        sr_code = (c.get("ttcp_xuat") or "").strip()
        sr_name = (c.get("ten_ttcp_xuat") or sr_code).strip()
        if not sr_code:
            continue
        sr_groups[(sr_code, sr_name)].append(c.get("vin").strip().upper())

    print(f"\n[2/3] Phân nhóm theo {len(sr_groups)} Showroom nhận:")
    for (code, name), vins in sorted(sr_groups.items(), key=lambda x: -len(x[1])):
        print(f"  • {code} - {name}: {len(vins)} xe")

    # 3. Thực thi tạo phiếu DNX (Mã GD 9) cho từng Showroom
    print(f"\n[3/3] Đang tiến hành tạo phiếu ĐNX trên hệ thống CyberSoft ERP...")
    results = []
    success_count = 0
    fail_count = 0
    total_cars_transferred = 0

    for idx, ((to_ttcp, to_name), vins) in enumerate(sr_groups.items(), start=1):
        print(f"\n[{idx}/{len(sr_groups)}] Đang điều chuyển {len(vins)} xe sang {to_ttcp} ({to_name})...")
        try:
            res = transfer_business_location({
                "vins": vins,
                "to_ttcp": to_ttcp,
                "to_ttcp_name": to_name,
                "reason": f"Điều chuyển địa điểm kinh doanh sang {to_name} (xe đã xuất HĐ)",
                "user_name": "02.NHANPT"
            })
            if res.get("success"):
                so_ct = res.get("so_ct")
                stt_rec = res.get("stt_rec")
                success_count += 1
                total_cars_transferred += len(vins)
                print(f"  ✅ THÀNH CÔNG: Đã tạo phiếu ĐNX số: {so_ct} (Stt_Rec: {stt_rec}) cho {len(vins)} xe.")
                results.append({
                    "to_ttcp": to_ttcp,
                    "to_name": to_name,
                    "so_ct": so_ct,
                    "stt_rec": stt_rec,
                    "total_cars": len(vins),
                    "vins": vins,
                    "success": True
                })
            else:
                fail_count += 1
                err = res.get("error") or "Không rõ nguyên nhân"
                print(f"  ❌ THẤT BẠI: {err}")
                results.append({
                    "to_ttcp": to_ttcp,
                    "to_name": to_name,
                    "total_cars": len(vins),
                    "vins": vins,
                    "success": False,
                    "error": err
                })
        except Exception as e:
            fail_count += 1
            print(f"  ❌ LỖI NGOẠI LỆ: {str(e)}")
            results.append({
                "to_ttcp": to_ttcp,
                "to_name": to_name,
                "total_cars": len(vins),
                "vins": vins,
                "success": False,
                "error": str(e)
            })

    # 4. Báo cáo tổng kết
    print("\n" + "=" * 80)
    print("📊 BÁO CÁO TỔNG KẾT ĐIỀU CHUYỂN ĐỊA ĐIỂM KINH DOANH (MÃ GD 9)")
    print("=" * 80)
    print(f"• Tổng số phiếu ĐNX đã lập: {success_count} phiếu")
    print(f"• Tổng số xe đã điều chuyển thành công: {total_cars_transferred} / {len(pending_cars)} xe")
    if fail_count > 0:
        print(f"• Số nhóm Showroom bị lỗi: {fail_count}")

    print("\nChi tiết các phiếu ĐNX đã lập trên CyberSoft:")
    for r in results:
        if r.get("success"):
            print(f"  ✔ Phiếu: {r['so_ct']} | Nhận: {r['to_ttcp']} - {r['to_name']} | SL: {r['total_cars']} xe")
        else:
            print(f"  ✘ Thất bại: {r['to_ttcp']} - {r['to_name']} | Lỗi: {r.get('error')}")

    # Xuất log ra file JSON để lưu trữ vết
    log_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scratch", "batch_transfer_result.json")
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nĐã lưu chi tiết nhật ký điều chuyển tại: {log_file}")

if __name__ == "__main__":
    from_date = sys.argv[1] if len(sys.argv) > 1 else "2026-01-01"
    run_batch_transfer(from_date)
