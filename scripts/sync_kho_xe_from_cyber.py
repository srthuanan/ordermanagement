"""
sync_kho_xe_from_cyber.py
=========================
Đồng bộ tồn kho xe VinFast từ CyberSoft ERP → Supabase (bảng khoxe).
- Chỉ sync xe VinFast (Ma_kx bắt đầu bằng VF hoặc LIMO, EB, v.v.)
- Upsert theo VIN (So_khung) - không tạo trùng
- Chạy hàng ngày qua Task Scheduler hoặc thủ công

Chạy: python scripts/sync_kho_xe_from_cyber.py
"""

import pyodbc
import requests
import json
import os
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

# ── CyberSoft ERP ──────────────────────────────────────────────
CYBER_CONN = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=SQLVanDao.Cybersoft.com.vn,7521;"
    "DATABASE=CyberAppGolden_VanDao;"
    "UID=cyber_vandao;"
    "PWD=HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv;"
    "TrustServerCertificate=yes"
)

# ── Supabase ────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get(
    "VITE_SUPABASE_URL",
    "https://jwvgxqrkjlbewvpkvucj.supabase.co"
)
SUPABASE_KEY = os.environ.get(
    "VITE_SUPABASE_SERVICE_KEY",
    os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")
)
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# ── Mapping Ma_kx → dong_xe + phien_ban ────────────────────────
# Dựa trên danh mục thực tế từ CyberSoft
MODEL_MAP = {
    # VinFast passenger
    "VF3":    ("VF 3",   ""),
    "VF5":    ("VF 5",   ""),
    "VF501":  ("VF 5",   "Plus"),
    "VF6":    ("VF 6",   ""),
    "VF601":  ("VF 6",   "Eco"),
    "VF603":  ("VF 6",   "Plus"),
    "VF7":    ("VF 7",   ""),
    "VF8":    ("VF 8",   ""),
    "VF8 S":  ("VF 8",   "Eco"),
    "VF9":    ("VF 9",   ""),
    "LIMO":   ("VF e34", ""),  # Limo = e34 cũ
    "VF2":    ("VF 2",   ""),
    # VinFast electric buses/trucks
    "EB15":   ("eBus 15", ""),
    "EB20":   ("eBus 20", ""),
    "VF604":  ("VF 6",   "Plus"),
    "VF608":  ("VF 6",   ""),
    "VF709":  ("VF 7",   ""),
    "VF711":  ("VF 7",   ""),
    "VF722":  ("VF 7",   ""),
    "VF727":  ("VF 7",   ""),
    "VF744":  ("VF 7",   ""),
    "VF758":  ("VF 7",   ""),
    "VF759":  ("VF 7",   ""),
    "VF793":  ("VF 7",   ""),
    "VF794":  ("VF 7",   ""),
    "VF804":  ("VF 8",   ""),
    "VF908":  ("VF 9",   ""),
    "VF926":  ("VF 9",   ""),
    "FC025":  ("VF 3",   ""),
}

# Màu ngoại thất: Ma_Mau → tên màu
COLOR_MAP = {
    "CE11": "Cloudy White (CE11)",
    "CE12": "Starlight Silver (CE12)",
    "CE13": "Midnight Black (CE13)",
    "CE14": "Aurora Blue (CE14)",
    "CE15": "Brahminy White (CE15)",
    "CE16": "Sage Green (CE16)",
    "CE17": "Burgundy (CE17)",
    "CE18": "Brahminy White (CE18)",
    "CE19": "Khaki Brown (CE19)",
    "CE1M": "Brahminy White (CE1M)",
    "111V": "Silver (111V)",
    "1711": "Grey (1711)",
    "171V": "Dark Grey (171V)",
    "26U":  "White (26U)",
    "300":  "Black (300)",
    "BAC":  "Bạc",
    "BE":   "Bê tông",
    "CAM":  "Cam",
}


def serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj) if obj is not None else None


def fetch_cyber_inventory():
    """Lấy danh sách xe VinFast từ CyberSoft ERP."""
    print("🔌 Đang kết nối CyberSoft ERP...")
    conn = pyodbc.connect(CYBER_CONN, timeout=15)
    c = conn.cursor()

    # Lấy xe VinFast: Ma_kx bắt đầu bằng VF, hoặc LIMO, EB, FC
    c.execute("""
        SELECT
            x.Ma_xe,
            x.Ma_kx,
            x.Ma_Mau,
            x.So_khung,
            x.So_may,
            x.Nam_sx,
            x.Ngay_mua,
            x.Ma_kh,
            x.Ten_kh,
            x.Dien_thoai,
            x.So_Km,
            x.Ghi_chu,
            x.Acti,
            x.Ma_Dvcs
        FROM DmXe x
        WHERE (
            x.Ma_kx LIKE 'VF%'
            OR x.Ma_kx LIKE 'EB%'
            OR x.Ma_kx = 'LIMO'
            OR x.Ma_kx LIKE 'FC%'
        )
        AND x.So_khung IS NOT NULL
        AND x.So_khung <> ''
        ORDER BY x.Ngay_mua DESC
    """)

    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()

    result = [dict(zip(cols, r)) for r in rows]
    print(f"   ✅ Lấy được {len(result)} xe VinFast từ CyberSoft")
    return result


def map_to_supabase(xe):
    """Chuyển đổi 1 xe từ CyberSoft sang format bảng khoxe của Supabase."""
    ma_kx   = (xe.get("Ma_kx") or "").strip()
    ma_mau  = (xe.get("Ma_Mau") or "").strip()

    # dong_xe + phien_ban
    if ma_kx in MODEL_MAP:
        dong_xe, phien_ban = MODEL_MAP[ma_kx]
    elif ma_kx.startswith("VF"):
        # Fallback: "VF601" → dong_xe="VF 6", phien_ban=""
        short = ma_kx.replace("VF", "VF ")
        dong_xe  = short[:4].strip()
        phien_ban = ""
    else:
        dong_xe  = ma_kx
        phien_ban = ""

    # Màu ngoài
    ngoai_that = COLOR_MAP.get(ma_mau, ma_mau if ma_mau else "")

    # Trạng thái kho: Acti = None/empty → còn kho; có giá trị → đã bán/xuất
    acti = xe.get("Acti")
    if acti:
        trang_thai = "Đã xuất"
    else:
        trang_thai = "Trong kho"

    # Ngày nhập
    ngay_mua = xe.get("Ngay_mua")
    ngay_nhap_str = ngay_mua.isoformat() if isinstance(ngay_mua, (datetime, date)) else None

    return {
        "vin":        xe.get("So_khung", "").strip(),
        "ma_dms":     xe.get("Ma_xe", "").strip(),
        "dong_xe":    dong_xe,
        "phien_ban":  phien_ban,
        "ngoai_that": ngoai_that,
        "noi_that":   "",           # CyberSoft không có field nội thất riêng
        "so_may":     xe.get("So_may", "").strip(),
        "trang_thai": trang_thai,
        "ngay_nhap":  ngay_nhap_str,
    }


def upsert_to_supabase(records, chunk_size=50):
    """Upsert danh sách xe lên Supabase (theo VIN)."""
    print(f"\n🚀 Đang upsert {len(records)} xe lên Supabase (bảng khoxe)...")

    total_ok   = 0
    total_fail = 0
    url = f"{SUPABASE_URL}/rest/v1/khoxe"

    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        chunk_n = i // chunk_size + 1
        total_chunks = (len(records) + chunk_size - 1) // chunk_size

        resp = requests.post(
            url,
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
            json=chunk,
            params={"on_conflict": "vin"},
            timeout=30,
        )

        if 200 <= resp.status_code < 300:
            total_ok += len(chunk)
            print(f"   ✅ Chunk {chunk_n}/{total_chunks}: {len(chunk)} xe OK")
        else:
            total_fail += len(chunk)
            print(f"   ❌ Chunk {chunk_n}: {resp.status_code} - {resp.text[:200]}")

    return total_ok, total_fail


def main():
    print("=" * 60)
    print("  🔄 SYNC KHO XE: CyberSoft ERP → Supabase")
    print(f"  Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 1. Lấy từ CyberSoft
    xe_list = fetch_cyber_inventory()
    if not xe_list:
        print("⚠️  Không có xe nào để sync.")
        return

    # 2. Mapping
    records = []
    for xe in xe_list:
        r = map_to_supabase(xe)
        if r["vin"]:  # phải có VIN
            records.append(r)

    print(f"   📦 Mapped {len(records)} xe hợp lệ (có VIN)")

    # 3. Preview 5 xe đầu
    print("\n   Preview 5 xe đầu tiên:")
    for r in records[:5]:
        print(f"   • {r['vin'][:20]:20s} | {r['dong_xe']:8s} {r['phien_ban']:6s} | {r['ngoai_that'][:25]} | {r['trang_thai']}")

    # 4. Upsert lên Supabase
    ok, fail = upsert_to_supabase(records)

    print()
    print("=" * 60)
    print(f"  📊 KẾT QUẢ: {ok} thành công | {fail} thất bại")
    print(f"  ✅ Sync hoàn tất lúc {datetime.now().strftime('%H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
