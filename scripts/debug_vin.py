"""
Debug cụ thể VIN RLLVFPTT9TH774343 - tại sao không hiển thị số máy
"""
import urllib.request, urllib.parse, json, sys

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
}

TARGET_VIN    = "RLLVFPTT9TH774343"
TARGET_ORDER  = "N31913-VSO-26-05-0131"

def get(table, select="*", filters=None):
    params = {"select": select, "limit": "5000"}
    if filters:
        params.update(filters)
    qs = "&".join(f"{urllib.parse.quote(k)}={urllib.parse.quote(str(v))}" for k, v in params.items())
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}")

def show(label, data):
    print(f"\n  {label}:")
    if not data:
        print("    (không có bản ghi)")
    elif isinstance(data, list):
        for row in data:
            for k, v in row.items():
                print(f"    {k}: {v!r}")
            print()
    else:
        for k, v in data.items():
            print(f"    {k}: {v!r}")

# ─────────────────────────────────────────────────────
print("=" * 65)
print(f"  DEBUG VIN: {TARGET_VIN}")
print(f"  ĐƠN   : {TARGET_ORDER}")
print("=" * 65)

# 1. Bảng donhang
print("\n[1] donhang (đơn hàng chính)")
rows = get("donhang", filters={"so_don_hang": f"eq.{TARGET_ORDER}"})
show("donhang", rows)
if rows:
    don = rows[0]
    print(f"  ► so_may trong donhang : {don.get('so_may')!r}")
    print(f"  ► vin trong donhang    : {don.get('vin')!r}")

# 2. Bảng khoxe
print("\n[2] khoxe (kho xe)")
rows_kho = get("khoxe", filters={"vin": f"eq.{TARGET_VIN}"})
show("khoxe", rows_kho)
if rows_kho:
    print(f"  ► so_may trong khoxe  : {rows_kho[0].get('so_may')!r}")
else:
    print("  ► ❌ VIN NÀY KHÔNG CÓ TRONG BẢNG khoxe!")

# 3. Bảng thongtinxe
print("\n[3] thongtinxe")
rows_ttx = get("thongtinxe", filters={"vin": f"eq.{TARGET_VIN}"})
show("thongtinxe", rows_ttx)
if rows_ttx:
    print(f"  ► so_may trong thongtinxe: {rows_ttx[0].get('so_may')!r}")
else:
    print("  ► ❌ VIN NÀY KHÔNG CÓ TRONG BẢNG thongtinxe!")

# 4. Thử tìm VIN gần giống (phòng trường hợp có khoảng trắng/uppercase khác)
print("\n[4] Tìm kiếm mờ trong thongtinxe (LIKE)")
all_ttx = get("thongtinxe", select="vin,so_may", filters={"vin": f"ilike.%{TARGET_VIN[-8:]}%"})
print(f"  Tìm với suffix '{TARGET_VIN[-8:]}': {len(all_ttx)} kết quả")
for r in all_ttx:
    print(f"    vin={r.get('vin')!r}  so_may={r.get('so_may')!r}")

print("\n[5] Tìm kiếm mờ trong khoxe (LIKE)")
all_kho = get("khoxe", select="vin,so_may,trang_thai", filters={"vin": f"ilike.%{TARGET_VIN[-8:]}%"})
print(f"  Tìm với suffix '{TARGET_VIN[-8:]}': {len(all_kho)} kết quả")
for r in all_kho:
    print(f"    vin={r.get('vin')!r}  so_may={r.get('so_may')!r}  trang_thai={r.get('trang_thai')!r}")

# 5. Bảng yeucauxhd
print("\n[6] yeucauxhd (yêu cầu xuất hóa đơn)")
rows_xhd = get("yeucauxhd", filters={"vin": f"eq.{TARGET_VIN}"})
show("yeucauxhd", rows_xhd)

print("\n" + "=" * 65)
print("  KẾT LUẬN")
print("=" * 65)
if not rows_kho and rows_ttx and rows_ttx[0].get("so_may"):
    print(f"""
  ❗ VẤN ĐỀ XÁC ĐỊNH:
     VIN '{TARGET_VIN}' có số máy trong bảng 'thongtinxe'
     NHƯNG không tồn tại trong bảng 'khoxe'

  Logic của app:
     mergedAllHistoryData chỉ tra cứu số máy từ:
       1. yeucauxhd.so_may  (theo Số đơn hàng)
       2. khoxe.so_may      (theo VIN)  ← không có!
       
     → Không bao giờ fallback sang thongtinxe trong useAppData.ts!

  FIX NGẮN HẠN:
     Nhập tay số máy vào bảng 'khoxe' cho VIN này.
     
  FIX DÀI HẠN:
     Thêm fallback tra cứu thongtinxe trong mergedAllHistoryData.
""")
elif rows_kho and not rows_kho[0].get("so_may") and rows_ttx and rows_ttx[0].get("so_may"):
    print(f"""
  ❗ VẤN ĐỀ XÁC ĐỊNH:
     khoxe có VIN nhưng so_may = null/trống
     thongtinxe có so_may = {rows_ttx[0].get('so_may')!r}
     
  FIX: Sync so_may từ thongtinxe → khoxe
""")
