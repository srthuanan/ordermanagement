import json
import collections
from datetime import datetime

with open("scripts/cyber_data/cyber_ky_moi_xhd_oct2026.json", "r", encoding="utf-8") as f:
    data = json.load(f)

ky_moi = data["ky_moi"]
xhd = data["xhd"]

print("=== 1. TỔNG HỢP THEO SHOWROOM ===")
sr_stats = collections.defaultdict(lambda: {
    "ky_moi_count": 0, "ky_moi_val": 0,
    "xhd_count": 0, "xhd_val": 0,
    "ky_moi_models": collections.defaultdict(int),
    "xhd_models": collections.defaultdict(int)
})

for r in ky_moi:
    sr = r["showroom"]
    sr_stats[sr]["ky_moi_count"] += 1
    sr_stats[sr]["ky_moi_val"] += float(r.get("gia_tri") or 0)
    # Rút gọn dòng xe
    kx = r.get("ma_kx") or "Khác"
    sr_stats[sr]["ky_moi_models"][kx] += 1

for r in xhd:
    sr = r["showroom"]
    sr_stats[sr]["xhd_count"] += 1
    sr_stats[sr]["xhd_val"] += float(r.get("tong_thanh_toan") or 0)
    kx = r.get("ma_kx") or "Khác"
    sr_stats[sr]["xhd_models"][kx] += 1

for sr, s in sorted(sr_stats.items()):
    print(f"Showroom: {sr}")
    print(f"  - Ký mới: {s['ky_moi_count']} HĐ | Tổng giá trị: {s['ky_moi_val']:,.0f} VNĐ")
    print(f"    Chi tiết dòng xe: {dict(s['ky_moi_models'])}")
    print(f"  - Xuất hoá đơn: {s['xhd_count']} xe | Tổng doanh số: {s['xhd_val']:,.0f} VNĐ")
    print(f"    Chi tiết dòng xe: {dict(s['xhd_models'])}")

print("\n=== 2. TỔNG TOÀN BỘ 5 SHOWROOM ===")
tot_km = len(ky_moi)
tot_km_val = sum(float(r.get("gia_tri") or 0) for r in ky_moi)
tot_xhd = len(xhd)
tot_xhd_val = sum(float(r.get("tong_thanh_toan") or 0) for r in xhd)
print(f"Tổng ký mới: {tot_km} hợp đồng ({tot_km_val:,.0f} VNĐ)")
print(f"Tổng xuất HĐ: {tot_xhd} xe ({tot_xhd_val:,.0f} VNĐ)")

# Phân bố theo ngày
date_km = collections.defaultdict(int)
for r in ky_moi:
    date_km[r["ngay_ky"]] += 1
print("\n=== 3. KÝ MỚI THEO NGÀY ===")
for d, c in sorted(date_km.items(), key=lambda x: datetime.strptime(x[0], "%d/%m/%Y") if True else x[0]):
    print(f"  Ngày {d}: {c} HĐ")

date_xhd = collections.defaultdict(int)
for r in xhd:
    date_xhd[r["ngay_hd"]] += 1
print("\n=== 4. XUẤT HĐ THEO NGÀY ===")
for d, c in sorted(date_xhd.items()):
    print(f"  Ngày {d}: {c} Hoá đơn")
