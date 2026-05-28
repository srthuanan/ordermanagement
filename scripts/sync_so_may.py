"""
Lấy TOÀN BỘ thongtinxe (pagination) rồi sync so_may → khoxe
"""
import urllib.request, urllib.parse, json

SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ"
    ".R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
)
HEADERS = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Content-Type": "application/json"}
PAGE = 1000

def get_page(table, select, offset, limit=PAGE):
    params = {"select": select, "limit": str(limit), "offset": str(offset)}
    qs = "&".join(f"{urllib.parse.quote(k)}={urllib.parse.quote(v)}" for k, v in params.items())
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

def get_all(table, select):
    """Lấy tất cả records bằng cách phân trang."""
    result, offset = [], 0
    while True:
        page = get_page(table, select, offset)
        result.extend(page)
        print(f"    offset={offset} → {len(page)} records (tổng: {len(result)})")
        if len(page) < PAGE:
            break
        offset += PAGE
    return result

def patch(table, filter_key, filter_val, body):
    qs = f"{urllib.parse.quote(filter_key)}=eq.{urllib.parse.quote(str(filter_val))}"
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={**HEADERS, "Prefer": "return=representation"}, method="PATCH")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

print("=" * 70)
print("  SYNC TOÀN BỘ: thongtinxe → khoxe (với pagination)")
print("=" * 70)

# 1. Lấy toàn bộ thongtinxe
print("\n[1] Tải toàn bộ thongtinxe (có pagination)...")
all_ttx = get_all("thongtinxe", "vin,so_may")
ttx_map = {}
for t in all_ttx:
    vin = str(t.get("vin") or "").strip().upper()
    so_may = str(t.get("so_may") or "").strip()
    if vin and so_may:
        ttx_map[vin] = so_may
print(f"  ✅ Tổng thongtinxe: {len(all_ttx)} records")
print(f"  ✅ Có số máy      : {len(ttx_map)} records")

# 2. Lấy khoxe thiếu số máy
print("\n[2] Lấy khoxe thiếu số máy...")
all_khoxe = get_all("khoxe", "vin,so_may,dong_xe,trang_thai")
missing = [k for k in all_khoxe if not str(k.get("so_may") or "").strip()]
print(f"  Tổng kho : {len(all_khoxe)}")
print(f"  Thiếu    : {len(missing)}")

# 3. Match và sync
print("\n[3] Matching & Sync...")
to_sync   = []
no_match  = []

for k in missing:
    vin = str(k.get("vin") or "").strip().upper()
    if vin in ttx_map:
        to_sync.append({"vin": vin, "so_may": ttx_map[vin], "dong_xe": k.get("dong_xe","")})
    else:
        no_match.append(k)

print(f"  Cần sync : {len(to_sync)}")
print(f"  Không khớp: {len(no_match)}")

success = failed = 0
for item in to_sync:
    try:
        patch("khoxe", "vin", item["vin"], {"so_may": item["so_may"]})
        print(f"  ✅ {item['vin']:<22} → {item['so_may']}")
        success += 1
    except Exception as e:
        print(f"  ❌ {item['vin']}: {e}")
        failed += 1

# 4. Kết quả
print(f"\n{'='*70}")
print(f"  KẾT QUẢ SYNC")
print(f"{'='*70}")
print(f"  ✅ Đã cập nhật: {success} xe")
print(f"  ❌ Thất bại   : {failed} xe")

if no_match:
    print(f"\n  [{len(no_match)} xe] Không tìm thấy trong thongtinxe (cần nhập tay / DMS sync):")
    for k in no_match:
        vin = str(k.get("vin","")).strip()
        print(f"    {vin:<22} | {k.get('dong_xe','?'):<20} | {k.get('trang_thai','?')}")

# 5. Verify cuối
print(f"\n[4] Kiểm tra lại sau khi sync...")
all_khoxe2 = get_all("khoxe", "vin,so_may")
still_missing = [k for k in all_khoxe2 if not str(k.get("so_may") or "").strip()]
print(f"\n  Trước: {len(missing)} xe thiếu số máy")
print(f"  Sau  : {len(still_missing)} xe thiếu số máy")
print(f"  Đã fix: {len(missing) - len(still_missing)} xe ✅")
