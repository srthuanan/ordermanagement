"""
Tìm hiểu tại sao 18 VIN trong khoxe không khớp với thongtinxe
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

def get(table, select="*", filters=None, limit=10000):
    params = {"select": select, "limit": str(limit)}
    if filters:
        params.update(filters)
    qs = "&".join(f"{urllib.parse.quote(k)}={urllib.parse.quote(str(v))}" for k, v in params.items())
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

def patch(table, filter_key, filter_val, body):
    qs = f"{urllib.parse.quote(filter_key)}=eq.{urllib.parse.quote(str(filter_val))}"
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={**HEADERS, "Prefer": "return=representation"}, method="PATCH")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

MISSING_VINS = [
    "RLLVFPNT5TH771470", "RLLVFPNT2TH771488", "RLLVFPNT9TH771651",
    "RLLVFPNT6TH771462", "RLLVFPTT9TH774343", "RLLVFPNT6TH771705",
    "RLLVFPNT1TH770185", "RLNV5JSE7TH750956", "RLLVFPNT9TH768314",
    "RLLVFPNT8TH771544", "RLLVFPNT4TH771590", "RLLVFPNT8TH771348",
    "RLNVBL9K5TT721890", "RLLVFPNT4TH766860", "RLLVFPNT3TH771404",
    "RLLVFPNT0TH753801", "RLNVBL9K4TT721668", "RLLVFPNT5TH771307",
]

print("=" * 70)
print("  PHÂN TÍCH VIN KHÔNG KHỚP")
print("=" * 70)

# Lấy toàn bộ thongtinxe
all_ttx = get("thongtinxe", select="vin,so_may,mo_ta", limit=5000)
# Lấy nhiều hơn nếu cần (pagination)
print(f"\n  thongtinxe tổng records: {len(all_ttx)}")

# Sample 5 bản ghi thongtinxe để xem format VIN
print("\n[1] Mẫu 5 bản ghi thongtinxe (xem format VIN):")
for t in all_ttx[:5]:
    vin = t.get("vin", "")
    print(f"   vin={vin!r} (len={len(vin)}) | so_may={t.get('so_may','')!r}")

# Tìm từng VIN bị thiếu bằng tìm kiếm partial (8 ký tự cuối)
print("\n[2] Tìm từng VIN theo suffix 8 ký tự cuối:")
found_with_may = []
not_found_at_all = []

for vin in MISSING_VINS:
    suffix = vin[-8:]
    matches = [t for t in all_ttx if suffix in str(t.get("vin","")).upper()]
    if matches:
        for m in matches:
            so_may = str(m.get("so_may","")).strip()
            print(f"   {vin} → ttx.vin={m['vin']!r} | so_may={so_may!r}")
            if so_may:
                found_with_may.append({"khoxe_vin": vin, "ttx_vin": m["vin"], "so_may": so_may})
    else:
        # Thử 6 ký tự cuối
        suffix6 = vin[-6:]
        matches6 = [t for t in all_ttx if suffix6 in str(t.get("vin","")).upper()]
        if matches6:
            for m in matches6:
                print(f"   {vin} → (6-char match) ttx.vin={m['vin']!r} | so_may={m.get('so_may','')!r}")
        else:
            print(f"   {vin} → ❌ Không tìm thấy dù 6 ký tự cuối")
            not_found_at_all.append(vin)

# Thử fetch trực tiếp 1 VIN cụ thể
print("\n[3] Fetch trực tiếp VIN RLLVFPTT9TH774343 từ thongtinxe:")
direct = get("thongtinxe", filters={"vin": "eq.RLLVFPTT9TH774343"})
print(f"   Kết quả exact: {direct}")

direct_ilike = get("thongtinxe", select="vin,so_may", filters={"vin": "ilike.%FPTT9TH774343%"})
print(f"   Kết quả ilike suffix: {direct_ilike}")

# Kiểm tra thongtinxe có >1000 records không (pagination)
print("\n[4] Kiểm tra tổng records thongtinxe (có bị giới hạn 1000 không?):")
ttx_page2 = get("thongtinxe", select="vin,so_may", filters={"offset": "1000"}, limit=100)
print(f"   Records từ offset 1000: {len(ttx_page2)}")
if ttx_page2:
    print(f"   Mẫu: {ttx_page2[0].get('vin')!r}")

# Nếu có mismatch về VIN (khác về dạng) → patch
if found_with_may:
    print(f"\n[5] Tìm thấy {len(found_with_may)} xe có thể sync (VIN khác format):")
    success = failed = 0
    for item in found_with_may:
        try:
            patch("khoxe", "vin", item["khoxe_vin"], {"so_may": item["so_may"]})
            print(f"   ✅ {item['khoxe_vin']} → {item['so_may']}")
            success += 1
        except Exception as e:
            print(f"   ❌ {item['khoxe_vin']}: {e}")
            failed += 1
    print(f"\n   Kết quả: {success} OK / {failed} lỗi")

print(f"\n  VIN hoàn toàn không tìm thấy trong thongtinxe: {len(not_found_at_all)}")
for v in not_found_at_all:
    print(f"    {v}")
