"""
Check lý do một số đơn hàng không có Số máy (so_may)
"""

import urllib.request
import urllib.parse
import json, sys

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ"
    ".R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
)
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact",
}

def get(table, select="*", filters=None, limit=10000):
    """Query Supabase REST API."""
    params = {"select": select, "limit": str(limit)}
    if filters:
        params.update(filters)
    qs = "&".join(f"{urllib.parse.quote(k)}={urllib.parse.quote(str(v))}" for k, v in params.items())
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code} on {table}: {body}")

# ─────────────────────────────────────────────────────────────
def main():
    print("=" * 68)
    print("  KIỂM TRA SỐ MÁY TRÊN ĐƠN HÀNG  (bảng: donhang)")
    print("=" * 68)

    # ── BƯỚC 0: Lấy sample để biết cấu trúc & các giá trị ket_qua ──
    print("\n[0] Kiểm tra cấu trúc bảng donhang...")
    sample = get("donhang", select="so_don_hang,ket_qua,vin,so_may,ma_dms", limit=5)
    if not sample:
        print("  ❌ Không lấy được dữ liệu từ bảng donhang!")
        return
    print(f"  ✅ Kết nối thành công. Cột mẫu: {list(sample[0].keys())}")

    # ── BƯỚC 1: Lấy toàn bộ đơn hàng ──
    print("\n[1] Tải toàn bộ đơn hàng...")
    all_orders = get("donhang",
                     select="so_don_hang,ten_khach_hang,vin,so_may,ma_dms,dong_xe,ket_qua")
    print(f"  Tổng đơn hàng: {len(all_orders)}")

    # Phân phối ket_qua
    ket_qua_counts = {}
    for o in all_orders:
        kq = str(o.get("ket_qua") or "(trống)").strip()
        ket_qua_counts[kq] = ket_qua_counts.get(kq, 0) + 1
    print("  Phân phối ket_qua:")
    for kq, cnt in sorted(ket_qua_counts.items(), key=lambda x: -x[1]):
        print(f"    {kq:<30} : {cnt}")

    # ── BƯỚC 2: Lọc đơn đã ghép VIN ──
    paired_keywords = ["đã ghép", "da ghep", "ghep", "matched"]
    paired = [o for o in all_orders
              if any(kw in str(o.get("ket_qua") or "").lower() for kw in paired_keywords)
              or (o.get("vin") and str(o.get("vin")).strip() != "")]

    # Cách 2: Lọc đơn có VIN (đã ghép thực sự)
    has_vin_orders = [o for o in all_orders if o.get("vin") and str(o.get("vin")).strip() != ""]
    
    print(f"\n[2] Đơn có VIN (đã ghép xe): {len(has_vin_orders)}")

    missing_engine = [o for o in has_vin_orders
                      if not o.get("so_may") or str(o.get("so_may")).strip() == ""]
    have_engine    = len(has_vin_orders) - len(missing_engine)

    print(f"  Có số máy   : {have_engine}")
    print(f"  Thiếu số máy: {len(missing_engine)}")
    pct = len(missing_engine) / len(has_vin_orders) * 100 if has_vin_orders else 0
    print(f"  Tỷ lệ thiếu : {pct:.1f}%")

    if not missing_engine:
        print("\n  ✅ Không có đơn nào thiếu số máy!")
        return

    # ── BƯỚC 3: Check bảng khoxe ──
    print(f"\n[3] Check bảng khoxe cho {len(missing_engine)} đơn thiếu số máy...")
    all_khoxe = get("khoxe", select="vin,so_may,ma_dms,dong_xe,trang_thai")
    khoxe_map = {}
    for k in all_khoxe:
        if k.get("vin"):
            khoxe_map[k["vin"].strip().upper()] = k
    print(f"  Tổng xe trong kho: {len(khoxe_map)}")

    # Check bảng thongtinxe
    print(f"\n[4] Check bảng thongtinxe...")
    try:
        all_ttx = get("thongtinxe", select="vin,so_may,khu_vuc")
        ttx_map = {t["vin"].strip().upper(): t for t in all_ttx if t.get("vin")}
        print(f"  Tổng bản ghi thongtinxe: {len(ttx_map)}")
    except Exception as e:
        ttx_map = {}
        print(f"  ⚠️  Không có bảng thongtinxe: {e}")

    # Phân loại từng đơn thiếu
    cat_khoxe_has   = []   # Trong khoxe, có số máy (app chưa sync)
    cat_khoxe_no    = []   # Trong khoxe, KHÔNG có số máy
    cat_ttx_has     = []   # Không trong khoxe, nhưng có trong thongtinxe
    cat_nowhere     = []   # Không tìm thấy ở đâu cả

    for o in missing_engine:
        vin = str(o.get("vin", "")).strip().upper()
        km  = khoxe_map.get(vin)
        ttx = ttx_map.get(vin)

        if km and km.get("so_may") and str(km["so_may"]).strip():
            cat_khoxe_has.append((o, km))
        elif km:
            cat_khoxe_no.append((o, km, ttx))
        elif ttx and ttx.get("so_may") and str(ttx["so_may"]).strip():
            cat_ttx_has.append((o, ttx))
        else:
            cat_nowhere.append((o, ttx))

    # ── KẾT QUẢ ──
    print("\n" + "=" * 68)
    print("  PHÂN TÍCH NGUYÊN NHÂN")
    print("=" * 68)
    print(f"  A. Có trong khoxe, khoxe ĐÃ có số máy (app chưa sync) : {len(cat_khoxe_has)}")
    print(f"  B. Có trong khoxe, khoxe CHƯA nhập số máy             : {len(cat_khoxe_no)}")
    print(f"  C. Không trong khoxe, nhưng thongtinxe có số máy      : {len(cat_ttx_has)}")
    print(f"  D. Không tìm thấy số máy ở bất kỳ nguồn nào           : {len(cat_nowhere)}")

    # Chi tiết nhóm B
    if cat_khoxe_no:
        print(f"\n{'─'*68}")
        print(f"  [B] Xe trong kho CHƯA có số máy ({len(cat_khoxe_no)} đơn)")
        print(f"{'─'*68}")
        for o, km, ttx in cat_khoxe_no[:15]:
            vin = str(o.get("vin","")).strip().upper()
            ttx_so_may = str(ttx.get("so_may","—")) if ttx else "—"
            print(f"  Đơn: {str(o.get('so_don_hang','')):<28} VIN: {vin}")
            print(f"       KH: {str(o.get('ten_khach_hang','?')):<25} trang_thai: {km.get('trang_thai','?')}")
            print(f"       thongtinxe.so_may: {ttx_so_may}")
            print()
        if len(cat_khoxe_no) > 15:
            print(f"  ... và {len(cat_khoxe_no)-15} đơn nữa")

    # Chi tiết nhóm A (app có thể tự sửa nếu reload)
    if cat_khoxe_has:
        print(f"\n{'─'*68}")
        print(f"  [A] Khoxe CÓ số máy nhưng donhang chưa được cập nhật ({len(cat_khoxe_has)} đơn)")
        print(f"{'─'*68}")
        for o, km in cat_khoxe_has[:10]:
            vin = str(o.get("vin","")).strip().upper()
            print(f"  Đơn: {str(o.get('so_don_hang','')):<28} VIN: {vin}")
            print(f"       khoxe.so_may = {km.get('so_may','?')}")
            print()

    # Chi tiết nhóm C
    if cat_ttx_has:
        print(f"\n{'─'*68}")
        print(f"  [C] Thongtinxe có số máy nhưng chưa sync sang ({len(cat_ttx_has)} đơn)")
        print(f"{'─'*68}")
        for o, ttx in cat_ttx_has[:10]:
            vin = str(o.get("vin","")).strip().upper()
            print(f"  Đơn: {str(o.get('so_don_hang','')):<28} VIN: {vin}")
            print(f"       thongtinxe.so_may = {ttx.get('so_may','?')}")
            print()

    # Chi tiết nhóm D
    if cat_nowhere:
        print(f"\n{'─'*68}")
        print(f"  [D] Không tìm thấy số máy ở bất kỳ đâu ({len(cat_nowhere)} đơn)")
        print(f"{'─'*68}")
        for o, _ in cat_nowhere[:10]:
            vin = str(o.get("vin","")).strip().upper()
            in_kho = "✅ có" if vin in khoxe_map else "❌ không"
            print(f"  Đơn: {str(o.get('so_don_hang','')):<28} VIN: {vin}")
            print(f"       KH: {str(o.get('ten_khach_hang','?'))}  |  Trong khoxe: {in_kho}")
            print()
        if len(cat_nowhere) > 10:
            print(f"  ... và {len(cat_nowhere)-10} đơn nữa")

    print("=" * 68)
    print("  KHUYẾN NGHỊ XỬ LÝ")
    print("=" * 68)
    if cat_khoxe_has:
        print(f"  → Nhóm A ({len(cat_khoxe_has)} đơn): Cập nhật so_may từ khoxe vào donhang")
    if cat_khoxe_no:
        print(f"  → Nhóm B ({len(cat_khoxe_no)} đơn): Upload file 'Thông tin xe' để nhập số máy vào kho")
    if cat_ttx_has:
        print(f"  → Nhóm C ({len(cat_ttx_has)} đơn): Đồng bộ so_may từ thongtinxe → khoxe")
    if cat_nowhere:
        print(f"  → Nhóm D ({len(cat_nowhere)} đơn): Cần nhập tay số máy hoặc chờ DMS sync")
    print()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
