import sys
import argparse
import json
import os
import requests
import re
from datetime import datetime, date
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

CYBER_CONN = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=SQLVanDao.Cybersoft.com.vn,7521;"
    "DATABASE=CyberAppGolden_VanDao;"
    "UID=cyber_vandao;"
    "PWD=HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv;"
    "TrustServerCertificate=yes"
)

SUPABASE_URL = os.environ.get(
    "VITE_SUPABASE_URL",
    "https://jwvgxqrkjlbewvpkvucj.supabase.co"
)
SUPABASE_KEY = os.environ.get(
    "VITE_SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"
)
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

MODEL_MAP = {
    # VF 3
    "VF3":        ("VF 3",   ""),
    "VF301":      ("VF 3",   "Tiêu chuẩn 1 màu"),
    "VF302":      ("VF 3",   "Tiêu chuẩn 2 màu"),
    "VF304":      ("VF 3",   "Nâng cao 2 màu"),
    "VF305":      ("VF 3",   "Plus tiêu chuẩn 2 màu"),
    "VF306":      ("VF 3",   "Plus nâng cao 2 màu"),
    # VF 2
    "VF2":        ("VF 2",   "Màu cơ bản"),
    "VF201":      ("VF 2",   "Màu nâng cao"),
    # VF 5
    "VF5":        ("VF 5",   ""),
    "VF501":      ("VF 5",   "Plus cơ bản"),
    "VF502":      ("VF 5",   "S"),
    "VF503":      ("VF 5",   "Plus nâng cao"),
    "VF504":      ("VF 5",   "Plus"),
    "HERIO":      ("VF 5",   "Herio Green"),
    "HERIOTC2":   ("VF 5",   "Herio Green TC2"),
    # VF 6
    "VF6":        ("VF 6",   ""),
    "VF601":      ("VF 6",   "Eco Nâng cấp"),
    "VF602":      ("VF 6",   "Plus Nâng cấp"),
    "VF603":      ("VF 6",   "Eco Tiêu chuẩn"),
    "VF604":      ("VF 6",   "Plus 1 màu"),
    "VF605":      ("VF 6",   "Plus 2 màu"),
    "VF607":      ("VF 6",   "Eco nâng cao"),
    "VF608":      ("VF 6",   "Plus"),
    "VF609":      ("VF 6",   "Plus 2 màu nâng cao"),
    # VF 7
    "VF7":        ("VF 7",   ""),
    "VF701":      ("VF 7",   "Eco Tiêu chuẩn 1"),
    "VF702":      ("VF 7",   "Plus trần thép Nâng cấp"),
    "VF703":      ("VF 7",   "Plus trần kính Nâng cấp"),
    "VF706":      ("VF 7",   "Eco Tiêu chuẩn 2"),
    "VF707":      ("VF 7",   "Plus trần thép 1 cầu"),
    "VF708":      ("VF 7",   "Plus trần kính 1 cầu"),
    "VF713":      ("VF 7",   "Eco HUD"),
    "VF784":      ("VF 7",   "Plus trần thép 2 cầu"),
    "VF793":      ("VF 7",   "Plus trần thép 2 cầu TC3"),
    "VF794":      ("VF 7",   "Plus trần thép 2 cầu NC"),
    # VF 8
    "VF8":        ("VF 8",   ""),
    "PD1U01":     ("VF 8",   "Eco Tiêu chuẩn"),
    "PD1U02":     ("VF 8",   "Plus"),
    "PD1U03":     ("VF 8",   "Lux Plus"),
    "PD1U05":     ("VF 8",   "Eco Nâng cấp"),
    "PD1U07":     ("VF 8",   "Plus Limited"),
    "VF806":      ("VF 8",   "Plus nâng cao"),
    "VF8THM":     ("VF 8",   "Thế hệ mới"),
    "VF8THMMNC":  ("VF 8",   "Thế hệ mới nâng cao"),
    "VF8 S":      ("VF 8",   "Eco"),
    # VF 9
    "VF9":        ("VF 9",   ""),
    "PE1U01":     ("VF 9",   "Eco"),
    "PE1U06":     ("VF 9",   "Plus 7 chỗ CATL trần thép"),
    "PE1U08":     ("VF 9",   "Plus 6 chỗ CATL trần kính"),
    "PE1U09":     ("VF 9",   "Plus 6 chỗ CATL trần thép"),
    "VF908":      ("VF 9",   "Plus 6 chỗ trần thép"),
    "VF926":      ("VF 9",   "Plus 7 chỗ trần thép"),
    # LIMO / EC Van / Khác
    "LIMO":       ("VF e34", "Limo Green"),
    "ECVAN":      ("EC Van", "Tiêu chuẩn"),
    "ECVAN01":    ("EC Van", "Tiêu chuẩn"),
    "ECVANNC":    ("EC Van", "Nâng cao"),
    "ECVANNCCT":  ("EC Van", "Nâng cao Cửa trượt"),
    "MINIOGREEN": ("MINIO",  "Green"),
    "MINIOMNC8":  ("MINIO",  "Màu nâng cao"),
    "MinioGreen": ("MINIO",  "Green"),
    "Nerio":      ("NERIO",  "Green"),
    "LACHONG":    ("LẠC HỒNG", "Tiêu chuẩn"),
    "VFMPV7":     ("VF MPV 7", "Tiêu chuẩn"),
    "VFMPV7MNC":  ("VF MPV 7", "Màu nâng cao"),
}

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
    "CE1V": "Bạc",
    "CE1W": "Xanh Lá Nhạt",
    "CE2Q": "Đỏ Ruby",
    "181U": "Vàng nóc trắng",
}

def fetch_allocations_from_cyber(from_date: str, to_date: str, ttcp_code="02.01.08"):
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30
        )
        is_pymssql = True
    except Exception as e:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)
        is_pymssql = False

    c = conn.cursor()

    sql = """
        SELECT
            k.So_khung                                  AS vin,
            k.So_May                                    AS so_may,
            k.Ma_Kx                                     AS ma_kx,
            ISNULL(kx.ten_kx, k.Ma_Kx)                  AS loai_xe_cyber,
            ISNULL(kx.Quy_Cach, '')                     AS phien_ban_cyber,
            k.Ma_Mau                                    AS ma_mau_ngoai,
            ISNULL(mx.ten_mau, '')                      AS ten_mau_ngoai,
            k.Ma_Mau_Nt                                 AS ma_mau_noi,
            ISNULL(mnt.ten_mau, '')                     AS ten_mau_noi,
            CAST(k.Nam_Sx AS INT)                       AS nam_sx,
            k.Ma_XHD                                    AS ma_dms,
            ISNULL(kho.Ten_kho, '')                     AS vi_tri_kho,
            k.Dien_Giai                                 AS ghi_chu,
            k.Invoid_Date                               AS ngay_phan_bo,
            k.ngay_ct                                   AS ngay_ct
        FROM CTKH k WITH (NOLOCK)
        LEFT JOIN DmKx kx WITH (NOLOCK)           ON k.Ma_Kx = kx.ma_kx
        LEFT JOIN dmMauxe mx WITH (NOLOCK)        ON k.Ma_Mau = mx.ma_Mau
        LEFT JOIN dmMauxeNt mnt WITH (NOLOCK)    ON k.Ma_Mau_Nt = mnt.Ma_mau_Nt
        LEFT JOIN Dmkho kho WITH (NOLOCK)         ON k.Ma_Vitri = kho.Ma_kho
        WHERE k.ngay_ct BETWEEN ? AND ?
          AND k.Ma_ct = 'K10'
          AND (k.Ma_TTCP_I = ? OR k.Ma_TTCP_DMS = ?)
          AND k.So_khung IS NOT NULL
          AND RTRIM(LTRIM(k.So_khung)) <> ''
        ORDER BY k.Invoid_Date DESC, k.So_khung
    """

    if is_pymssql:
        sql = sql.replace('?', '%s')

    c.execute(sql, (from_date, to_date, ttcp_code, ttcp_code))
    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()

    result = []
    for r in rows:
        row_dict = dict(zip(cols, r))
        result.append(row_dict)

    return result

def fetch_plan_map(vins: list) -> dict:
    if not vins:
        return {}
    url = f"{SUPABASE_URL}/rest/v1/kehoach_giaoxe"
    CHUNK_SIZE = 50
    plan_map = {}
    for i in range(0, len(vins), CHUNK_SIZE):
        chunk = vins[i:i + CHUNK_SIZE]
        try:
            params = {
                "select": "vin,vi_tri,raw_kho,ma_dms,so_may",
                "vin": f"in.({','.join(chunk)})"
            }
            resp = requests.get(url, headers=HEADERS, params=params, timeout=15)
            if resp.status_code == 200:
                for item in resp.json():
                    v = (item.get("vin") or "").strip().upper()
                    if v:
                        plan_map[v] = item
        except Exception as e:
            print(f"[Warn] Fetch plan map error: {e}", file=sys.stderr)
    return plan_map

def clean_location_name(name: str) -> str:
    if not name:
        return "Đang vận tải"
    cleaned = re.sub(
        r'^(Kho xe ô tô Vinfast|Kho xe ô tô Viinfast|Kho xe ô tô|Kho xe SR|Kho xe|Ô tô Vinfast|Ô tô VinFast|Vinfast|VinFast|Showroom|SR|Kho)\s*[-:–—]?\s*',
        '',
        name,
        flags=re.I
    )
    cleaned = re.sub(r'^Minh Đạo\s*[-–—:]\s*', '', cleaned, flags=re.I)
    cleaned = cleaned.strip(' -')
    return cleaned or "Đang vận tải"

def fetch_physical_locations_from_cyber(vins: list) -> dict:
    if not vins:
        return {}
    
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)

    c = conn.cursor()
    CHUNK_SIZE = 150
    results = {}

    for i in range(0, len(vins), CHUNK_SIZE):
        chunk = vins[i:i + CHUNK_SIZE]
        vin_list_str = ','.join([repr(v) for v in chunk])
        sql = f"""
            WITH TonSK AS (
                SELECT So_Khung, ma_kho, SUM(CASE WHEN nxt = '1' THEN So_Luong ELSE -1 * So_Luong END) AS Ton
                FROM CT70BEX WITH (NOLOCK)
                WHERE Ma_Post >= '9' AND So_Khung IN ({vin_list_str})
                GROUP BY So_Khung, ma_kho
            ),
            LatestSK AS (
                SELECT 
                    b.So_Khung, 
                    b.ma_kho, 
                    k.Ten_kho,
                    ROW_NUMBER() OVER(PARTITION BY b.So_Khung ORDER BY b.Ngay_Ct DESC, b.stt_rec DESC) AS rn
                FROM CT70BEX b WITH (NOLOCK)
                LEFT JOIN Dmkho k WITH (NOLOCK) ON b.ma_kho = k.Ma_kho
                WHERE b.nxt = '1' 
                  AND b.Ma_Post >= '9' 
                  AND b.So_Khung IN ({vin_list_str})
                  AND b.So_Khung IN (SELECT So_Khung FROM TonSK WHERE Ton >= 1)
            )
            SELECT So_Khung, ma_kho, Ten_kho
            FROM LatestSK
            WHERE rn = 1
        """
        c.execute(sql)
        for r in c.fetchall():
            vin = r[0].strip().upper()
            ma_kho = (r[1] or "").strip()
            raw_ten = (r[2] or "").strip()
            results[vin] = {
                "ma_kho": ma_kho,
                "raw_kho": raw_ten,
                "vi_tri": clean_location_name(raw_ten)
            }

    conn.close()
    return results

def sync_khoxe_locations_from_cyber(target_vins: list = None, preview: bool = False) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/khoxe"
    params = {
        "select": "id,vin,dong_xe,phien_ban,ngoai_that,vi_tri,trang_thai",
        "trang_thai": "neq.Đã bán",
        "limit": 1000
    }
    resp = requests.get(url, headers=HEADERS, params=params, timeout=20)
    if resp.status_code != 200:
        return {"success": False, "error": f"Supabase error: {resp.text}"}
    
    cars = resp.json()
    if target_vins:
        vins_set = set(v.strip().upper() for v in target_vins)
        cars = [c for c in cars if (c.get("vin") or "").strip().upper() in vins_set]

    vins = [(c.get("vin") or "").strip().upper() for c in cars if c.get("vin")]
    cyber_locs = fetch_physical_locations_from_cyber(vins)

    changes = []
    to_update = []

    for c in cars:
        vin = (c.get("vin") or "").strip().upper()
        curr_loc = (c.get("vi_tri") or "").strip()
        loc_info = cyber_locs.get(vin)
        new_loc = loc_info["vi_tri"] if loc_info else "Đang vận tải"
        is_changed = (curr_loc != new_loc)

        item = {
            "vin": vin,
            "dong_xe": c.get("dong_xe"),
            "phien_ban": c.get("phien_ban"),
            "ngoai_that": c.get("ngoai_that"),
            "current_location": curr_loc,
            "new_location": new_loc,
            "cyber_raw_kho": loc_info.get("raw_kho", "") if loc_info else "",
            "is_changed": is_changed
        }
        changes.append(item)

        if is_changed and not preview:
            to_update.append({"vin": vin, "vi_tri": new_loc})

    updated_count = 0
    if not preview and to_update:
        CHUNK = 50
        for i in range(0, len(to_update), CHUNK):
            chunk = to_update[i:i + CHUNK]
            up_res = requests.post(
                url,
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
                params={"on_conflict": "vin"},
                json=chunk,
                timeout=30
            )
            if 200 <= up_res.status_code < 300:
                updated_count += len(chunk)

    return {
        "success": True,
        "mode": "preview" if preview else "sync",
        "total_cars": len(cars),
        "changed_count": sum(1 for x in changes if x["is_changed"]),
        "updated_count": updated_count,
        "changes": changes
    }

def map_allocation_to_khoxe(car: dict, plan_map: dict = None, cyber_locations: dict = None) -> dict:
    ma_kx = (car.get("ma_kx") or "").strip()
    if ma_kx in MODEL_MAP:
        dong_xe, phien_ban = MODEL_MAP[ma_kx]
    elif ma_kx.startswith("VF"):
        dong_xe = "VF " + ma_kx[2:3] if len(ma_kx) >= 3 else ma_kx
        phien_ban = car.get("phien_ban_cyber") or ""
    else:
        dong_xe = car.get("loai_xe_cyber") or ma_kx
        phien_ban = car.get("phien_ban_cyber") or ""

    ma_mau_ngoai = (car.get("ma_mau_ngoai") or "").strip()
    ten_mau_ngoai = (car.get("ten_mau_ngoai") or "").strip()
    ngoai_that = COLOR_MAP.get(ma_mau_ngoai, ten_mau_ngoai if ten_mau_ngoai else ma_mau_ngoai)
    noi_that = (car.get("ten_mau_noi") or "").strip()

    invoid_dt = car.get("ngay_phan_bo")
    if isinstance(invoid_dt, (datetime, date)) and invoid_dt.year > 1900:
        ngay_nhap_str = invoid_dt.isoformat()
    else:
        ngay_ct = car.get("ngay_ct")
        ngay_nhap_str = ngay_ct.isoformat() if isinstance(ngay_ct, (datetime, date)) else datetime.now().isoformat()

    vin = car.get("vin", "").strip().upper()
    plan = (plan_map or {}).get(vin, {})
    cyber_loc = (cyber_locations or {}).get(vin, {})

    plan_location = (plan.get("vi_tri") or plan.get("raw_kho") or "").strip()
    cyber_phys_location = (cyber_loc.get("vi_tri") or "").strip()
    cyber_doc_location = (car.get("vi_tri_kho") or "").strip()

    # Thứ tự ưu tiên xác định vị trí xe:
    # 1. Vị trí thực tế đã về kho từ CT70BEX của CyberSoft
    # 2. Vị trí từ Kế hoạch giao nhà máy
    # 3. Vị trí trên chứng từ K10 Cyber
    # 4. Mặc định "Đang vận tải"
    if cyber_phys_location:
        vi_tri = cyber_phys_location
    elif plan_location:
        vi_tri = plan_location
    elif cyber_doc_location:
        vi_tri = clean_location_name(cyber_doc_location)
    else:
        vi_tri = "Đang vận tải"

    so_may = (car.get("so_may") or "").strip() or (plan.get("so_may") or "").strip()
    ma_dms = (car.get("ma_dms") or "").strip() or (plan.get("ma_dms") or "").strip()

    return {
        "vin": vin,
        "so_may": so_may,
        "dong_xe": dong_xe,
        "phien_ban": phien_ban,
        "ngoai_that": ngoai_that,
        "noi_that": noi_that,
        "ma_dms": ma_dms,
        "vi_tri": vi_tri,
        "trang_thai": "Trong kho",
        "ngay_nhap": ngay_nhap_str,
    }

def upsert_to_supabase_khoxe(records: list):
    if not records:
        return 0, 0

    url = f"{SUPABASE_URL}/rest/v1/khoxe"
    CHUNK_SIZE = 50
    total_ok = 0
    total_fail = 0

    for i in range(0, len(records), CHUNK_SIZE):
        chunk = records[i:i + CHUNK_SIZE]
        resp = requests.post(
            url,
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
            params={"on_conflict": "vin"},
            json=chunk,
            timeout=30
        )
        if 200 <= resp.status_code < 300:
            total_ok += len(chunk)
        else:
            total_fail += len(chunk)
            print(f"[Supabase Error] HTTP {resp.status_code}: {resp.text}", file=sys.stderr)

MODEL_SEARCH_ALIASES = {
    'VF 2': ['%VF 2%', '%VF2%'],
    'VF 3': ['%VF 3%', '%VF3%'],
    'VF 5': ['%VF 5%', '%VF5%', '%HERIO%'],
    'VF 6': ['%VF 6%', '%VF6%'],
    'VF 7': ['%VF 7%', '%VF7%'],
    'VF 8': ['%VF 8%', '%VF8%', '%PD1U%'],
    'VF 9': ['%VF 9%', '%VF9%', '%PE1U%'],
    'VF e34': ['%VF%e34%', '%VFe34%', '%VF e34%', '%LIMO%'],
    'VF MPV 7': ['%MPV 7%', '%MPV7%', '%VFMPV7%'],
    'EC Van': ['%EC%VAN%', '%ECVAN%'],
    'LIMO': ['%LIMO%'],
    'MINIO': ['%MINIO%'],
    'NERIO': ['%NERIO%'],
    'LẠC HỒNG': ['%LẠC%HỒNG%', '%LAC%HONG%'],
}

def normalize_model(ma_kx: str, ten_kx: str) -> str:
    mk = (ma_kx or '').strip().upper()
    tk = (ten_kx or '').strip().upper()
    if mk in MODEL_MAP:
        return MODEL_MAP[mk][0]
    combined = f"{mk} {tk}"
    if not combined.strip():
        return ""
    if re.search(r'\bVF\s*3\b|VF3', combined):
        return 'VF 3'
    if re.search(r'\bVF\s*5\b|VF5|HERIO', combined):
        return 'VF 5'
    if re.search(r'\bVF\s*6\b|VF6', combined):
        return 'VF 6'
    if re.search(r'\bVF\s*7\b|VF7', combined):
        return 'VF 7'
    if re.search(r'\bVF\s*8\b|VF8|PD1U', combined):
        return 'VF 8'
    if re.search(r'\bVF\s*9\b|VF9|PE1U', combined):
        return 'VF 9'
    if re.search(r'\bVF\s*2\b|VF2', combined):
        return 'VF 2'
    if re.search(r'\bVF\s*E34\b|VFE34|LIMO', combined):
        return 'VF e34'
    if re.search(r'MPV\s*7', combined):
        return 'VF MPV 7'
    if re.search(r'EC\s*VAN', combined):
        return 'EC Van'
    if re.search(r'MINIO', combined):
        return 'MINIO'
    if re.search(r'NERIO', combined):
        return 'NERIO'
    if re.search(r'LẠC\s*HỒNG|LAC\s*HONG', combined):
        return 'LẠC HỒNG'
    return tk.split()[0] if tk else mk

def get_cyber_plan_filter_options(model: str = ""):
    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)
        is_pymssql = False

    c = conn.cursor()
    ph = "%s" if is_pymssql else "?"

    # Tạo bảng tạm các số khung ĐÃ XUẤT HÓA ĐƠN trên toàn hệ thống Cyber (CTHDC, ct70be HDC, CTKH Ngay_HD_Ban)
    c.execute("""
        IF OBJECT_ID('tempdb..#InvoicedVins') IS NOT NULL DROP TABLE #InvoicedVins;
        SELECT DISTINCT So_khung INTO #InvoicedVins FROM (
            SELECT So_khung FROM CTHDC WITH (NOLOCK) WHERE So_khung IS NOT NULL AND So_khung <> ''
            UNION
            SELECT So_khung FROM ct70be WITH (NOLOCK) WHERE Ma_ct = 'HDC' AND So_khung IS NOT NULL AND So_khung <> ''
            UNION
            SELECT So_khung FROM CTKH WITH (NOLOCK) WHERE Ngay_HD_Ban > '1900-01-01' AND So_khung IS NOT NULL AND So_khung <> ''
        ) x;
        CREATE CLUSTERED INDEX IX_InvoicedVins ON #InvoicedVins(So_khung);
    """)

    # Chỉ lấy xe chưa xuất hóa đơn bán (loại bỏ sạch 100% xe đã có HĐ)
    base_where = "k.Ma_ct IN ('K10', 'K15') AND k.So_khung IS NOT NULL AND RTRIM(LTRIM(k.So_khung)) <> '' AND NOT EXISTS (SELECT 1 FROM #InvoicedVins inv WHERE inv.So_khung = k.So_khung)"

    # 1. Distinct Showrooms (TTCP)
    c.execute(f"""
        SELECT DISTINCT k.Ma_TTCP_I, ISNULL(ttcp.Ten_TTCP, k.Ma_TTCP_I) as Ten_TTCP, COUNT(*) as cnt
        FROM CTKH k WITH (NOLOCK)
        LEFT JOIN DmTTCP ttcp WITH (NOLOCK) ON k.Ma_TTCP_I = ttcp.Ma_TTCP
        WHERE {base_where}
        GROUP BY k.Ma_TTCP_I, ttcp.Ten_TTCP
        ORDER BY cnt DESC
    """)
    ttcp_list = [{"code": r[0].strip(), "name": (r[1] or "").strip(), "count": r[2]} for r in c.fetchall() if r[0] and r[0].strip()]

    # 2. Distinct Models (tất cả dòng xe có xe chưa XHĐ)
    c.execute(f"""
        SELECT DISTINCT k.Ma_Kx, ISNULL(kx.ten_kx, '') as ten_kx
        FROM CTKH k WITH (NOLOCK)
        LEFT JOIN DmKx kx WITH (NOLOCK) ON k.Ma_Kx = kx.ma_kx
        WHERE {base_where}
    """)
    model_rows = c.fetchall()
    model_set = set()
    for r in model_rows:
        m = normalize_model(r[0], r[1])
        if m:
            model_set.add(m)

    order_preference = ['VF 2', 'VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'VF e34', 'VF MPV 7', 'EC Van', 'LIMO', 'MINIO', 'LẠC HỒNG', 'NERIO']
    models = [m for m in order_preference if m in model_set]
    models += sorted([m for m in model_set if m not in order_preference])

    # 3. Distinct Versions (theo dòng xe nếu có)
    v_where = base_where
    v_params = []
    if model and model.strip() and model.strip() != 'Tất cả':
        m_clean = model.strip()
        aliases = MODEL_SEARCH_ALIASES.get(m_clean, [f"%{m_clean}%", f"%{m_clean.replace(' ', '')}%"])
        conds = [f"(k.Ma_Kx LIKE {ph} OR kx.ten_kx LIKE {ph})" for _ in aliases]
        v_where += f" AND ({ ' OR '.join(conds) })"
        for a in aliases:
            v_params.extend([a, a])

    c.execute(f"""
        SELECT DISTINCT k.Ma_Kx, ISNULL(kx.ten_kx, '') as ten_kx, ISNULL(kx.Quy_Cach, '') as quy_cach
        FROM CTKH k WITH (NOLOCK)
        LEFT JOIN DmKx kx WITH (NOLOCK) ON k.Ma_Kx = kx.ma_kx
        WHERE {v_where}
    """, tuple(v_params))
    v_rows = c.fetchall()
    v_set = set()
    for ma_kx, ten_kx, qc in v_rows:
        ma_kx = (ma_kx or '').strip()
        qc = (qc or '').strip()
        if ma_kx in MODEL_MAP and MODEL_MAP[ma_kx][1]:
            v_set.add(MODEL_MAP[ma_kx][1])
        elif qc:
            v_set.add(qc)
    versions = sorted(list(v_set))

    # 4. Distinct Colors (theo dòng xe nếu có)
    color_where = base_where
    c_params = []
    if model and model.strip() and model.strip() != 'Tất cả':
        m_clean = model.strip()
        aliases = MODEL_SEARCH_ALIASES.get(m_clean, [f"%{m_clean}%", f"%{m_clean.replace(' ', '')}%"])
        conds = [f"(k.Ma_Kx LIKE {ph} OR kx.ten_kx LIKE {ph})" for _ in aliases]
        color_where += f" AND ({ ' OR '.join(conds) })"
        for a in aliases:
            c_params.extend([a, a])

    c.execute(f"""
        SELECT DISTINCT ISNULL(mx.ten_mau, k.Ma_Mau) as ten_mau, COUNT(*) as cnt
        FROM CTKH k WITH (NOLOCK)
        LEFT JOIN DmKx kx WITH (NOLOCK) ON k.Ma_Kx = kx.ma_kx
        LEFT JOIN dmMauxe mx WITH (NOLOCK) ON k.Ma_Mau = mx.ma_Mau
        WHERE {color_where}
        GROUP BY ISNULL(mx.ten_mau, k.Ma_Mau)
        ORDER BY cnt DESC
    """, tuple(c_params))
    colors = [r[0].strip() for r in c.fetchall() if r[0] and r[0].strip()]

    conn.close()
    return {"success": True, "ttcp_list": ttcp_list, "models": models, "versions": versions, "colors": colors}

def search_cyber_factory_plan(params: dict) -> dict:
    keyword = (params.get("keyword") or "").strip()
    model = (params.get("model") or "").strip()
    version = (params.get("version") or "").strip()
    color = (params.get("color") or "").strip()
    ttcp = (params.get("ttcp") or "").strip()
    limit = min(int(params.get("limit", 150)), 500)
    offset = max(int(params.get("offset", 0)), 0)

    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)
        is_pymssql = False

    c = conn.cursor()

    ph = "%s" if is_pymssql else "?"

    # Tạo bảng tạm các số khung ĐÃ XUẤT HÓA ĐƠN trên toàn hệ thống Cyber (CTHDC, ct70be HDC, CTKH Ngay_HD_Ban)
    c.execute("""
        IF OBJECT_ID('tempdb..#InvoicedVins') IS NOT NULL DROP TABLE #InvoicedVins;
        SELECT DISTINCT So_khung INTO #InvoicedVins FROM (
            SELECT So_khung FROM CTHDC WITH (NOLOCK) WHERE So_khung IS NOT NULL AND So_khung <> ''
            UNION
            SELECT So_khung FROM ct70be WITH (NOLOCK) WHERE Ma_ct = 'HDC' AND So_khung IS NOT NULL AND So_khung <> ''
            UNION
            SELECT So_khung FROM CTKH WITH (NOLOCK) WHERE Ngay_HD_Ban > '1900-01-01' AND So_khung IS NOT NULL AND So_khung <> ''
        ) x;
        CREATE CLUSTERED INDEX IX_InvoicedVins ON #InvoicedVins(So_khung);
    """)

    # Bắt buộc: chỉ lấy xe chưa xuất hóa đơn bán (loại bỏ sạch 100% xe đã có HĐ), toàn bộ K10+K15
    where_clauses = [
        "k.Ma_ct IN ('K10', 'K15')",
        "k.So_khung IS NOT NULL",
        "RTRIM(LTRIM(k.So_khung)) <> ''",
        "NOT EXISTS (SELECT 1 FROM #InvoicedVins inv WHERE inv.So_khung = k.So_khung)"
    ]
    sql_params = []

    if keyword:
        where_clauses.append(f"(k.So_khung LIKE {ph} OR k.So_May LIKE {ph} OR k.Ma_XHD LIKE {ph} OR k.Dien_Giai LIKE {ph} OR k.Ma_Kx LIKE {ph} OR kx.ten_kx LIKE {ph} OR mx.ten_mau LIKE {ph} OR ttcp.Ten_TTCP LIKE {ph})")
        kw_like = f"%{keyword}%"
        sql_params.extend([kw_like] * 8)

    if model and model != 'Tất cả':
        m_clean = model.strip()
        aliases = MODEL_SEARCH_ALIASES.get(m_clean, [f"%{m_clean}%", f"%{m_clean.replace(' ', '')}%"])
        conds = [f"(k.Ma_Kx LIKE {ph} OR kx.ten_kx LIKE {ph})" for _ in aliases]
        where_clauses.append(f"({ ' OR '.join(conds) })")
        for a in aliases:
            sql_params.extend([a, a])

    if version and version != 'Tất cả':
        matching_ma_kx = [k for k, v in MODEL_MAP.items() if v[1].lower() == version.lower()]
        v_conds = []
        if matching_ma_kx:
            ph_list = ', '.join([ph] * len(matching_ma_kx))
            v_conds.append(f"k.Ma_Kx IN ({ph_list})")
            sql_params.extend(matching_ma_kx)
        v_conds.append(f"kx.Quy_Cach LIKE {ph}")
        sql_params.append(f"%{version}%")
        v_conds.append(f"kx.ten_kx LIKE {ph}")
        sql_params.append(f"%{version}%")
        where_clauses.append(f"({ ' OR '.join(v_conds) })")

    if color and color != 'Tất cả':
        where_clauses.append(f"(k.Ma_Mau LIKE {ph} OR mx.ten_mau LIKE {ph})")
        c_like = f"%{color}%"
        sql_params.extend([c_like, c_like])
        sql_params.extend([c_like, c_like])

    if ttcp and ttcp != 'Tất cả':
        where_clauses.append(f"(k.Ma_TTCP_I = {ph} OR k.Ma_TTCP_DMS = {ph})")
        sql_params.extend([ttcp, ttcp])

    where_sql = " AND ".join(where_clauses)

    # 1. Count total
    count_sql = f"""
        SELECT COUNT(*)
        FROM CTKH k WITH (NOLOCK)
        LEFT JOIN DmKx kx WITH (NOLOCK) ON k.Ma_Kx = kx.ma_kx
        LEFT JOIN dmMauxe mx WITH (NOLOCK) ON k.Ma_Mau = mx.ma_Mau
        LEFT JOIN DmTTCP ttcp WITH (NOLOCK) ON k.Ma_TTCP_I = ttcp.Ma_TTCP
        WHERE {where_sql}
    """
    c.execute(count_sql, tuple(sql_params))
    total_count = c.fetchone()[0]

    # 2. Query page
    query_sql = f"""
        SELECT
            k.So_khung                                  AS vin,
            k.So_May                                    AS so_may,
            k.Ma_Kx                                     AS ma_kx,
            ISNULL(kx.ten_kx, k.Ma_Kx)                  AS ten_kx,
            ISNULL(kx.Quy_Cach, '')                     AS phien_ban,
            k.Ma_Mau                                    AS ma_mau,
            ISNULL(mx.ten_mau, '')                      AS ten_mau,
            k.Ma_Mau_Nt                                 AS ma_mau_nt,
            ISNULL(mnt.ten_mau, '')                     AS ten_mau_nt,
            CAST(k.Nam_Sx AS INT)                       AS nam_sx,
            k.Ma_XHD                                    AS ma_dms,
            k.Ma_TTCP_I                                 AS ma_ttcp,
            ISNULL(ttcp.Ten_TTCP, k.Ma_TTCP_I)          AS ten_ttcp,
            ISNULL(kho.Ten_kho, '')                     AS vi_tri_kho,
            k.Dien_Giai                                 AS ghi_chu,
            k.Invoid_Date                               AS ngay_phan_bo,
            k.ngay_ct                                   AS ngay_ct,
            k.ma_ct                                     AS ma_ct
        FROM CTKH k WITH (NOLOCK)
        LEFT JOIN DmKx kx WITH (NOLOCK)           ON k.Ma_Kx = kx.ma_kx
        LEFT JOIN dmMauxe mx WITH (NOLOCK)        ON k.Ma_Mau = mx.ma_Mau
        LEFT JOIN dmMauxeNt mnt WITH (NOLOCK)    ON k.Ma_Mau_Nt = mnt.Ma_mau_Nt
        LEFT JOIN DmTTCP ttcp WITH (NOLOCK)       ON k.Ma_TTCP_I = ttcp.Ma_TTCP
        LEFT JOIN Dmkho kho WITH (NOLOCK)         ON k.Ma_Vitri = kho.Ma_kho
        WHERE {where_sql}
        ORDER BY k.ngay_ct DESC, k.stt_rec DESC
        OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY
    """
    c.execute(query_sql, tuple(sql_params))
    cols = [d[0] for d in c.description]
    rows = c.fetchall()

    results = []
    vins = []
    for r in rows:
        row_d = dict(zip(cols, r))
        if row_d.get('ngay_ct'):
            row_d['ngay_ct'] = str(row_d['ngay_ct'])[:10]
        if row_d.get('ngay_phan_bo'):
            pb = str(row_d['ngay_phan_bo'])[:10]
            row_d['ngay_phan_bo'] = pb if not pb.startswith('1900') else ''
        
        # Format model name using MODEL_MAP or normalize_model
        ma_kx = (row_d.get('ma_kx') or '').strip()
        ten_kx = (row_d.get('ten_kx') or '').strip()
        if ma_kx in MODEL_MAP:
            d_name, p_name = MODEL_MAP[ma_kx]
            row_d['dong_xe'] = d_name
            if p_name and not row_d.get('phien_ban'):
                row_d['phien_ban'] = p_name
        else:
            row_d['dong_xe'] = normalize_model(ma_kx, ten_kx) or row_d.get('ten_kx') or ma_kx

        results.append(row_d)
        if row_d.get('vin'):
            vins.append(row_d['vin'].strip().upper())

    # 3. Lookup physical warehouse from CT70BEX for these VINs
    if vins:
        vin_list_str = ','.join([repr(v) for v in vins])
        bex_sql = f"""
            WITH TonSK AS (
                SELECT So_Khung, ma_kho, SUM(CASE WHEN nxt = '1' THEN So_Luong ELSE -1 * So_Luong END) AS Ton
                FROM CT70BEX WITH (NOLOCK)
                WHERE Ma_Post >= '9' AND So_Khung IN ({vin_list_str})
                GROUP BY So_Khung, ma_kho
            ),
            LatestSK AS (
                SELECT 
                    b.So_Khung, 
                    b.ma_kho, 
                    k.Ten_kho,
                    ROW_NUMBER() OVER(PARTITION BY b.So_Khung ORDER BY b.Ngay_Ct DESC, b.stt_rec DESC) AS rn
                FROM CT70BEX b WITH (NOLOCK)
                LEFT JOIN Dmkho k WITH (NOLOCK) ON b.ma_kho = k.Ma_kho
                WHERE b.nxt = '1' 
                  AND b.Ma_Post >= '9' 
                  AND b.So_Khung IN ({vin_list_str})
                  AND b.So_Khung IN (SELECT So_Khung FROM TonSK WHERE Ton >= 1)
            )
            SELECT So_Khung, ma_kho, Ten_kho
            FROM LatestSK
            WHERE rn = 1
        """
        c.execute(bex_sql)
        wh_map = {r[0].strip().upper(): (r[1], r[2]) for r in c.fetchall()}
        for item in results:
            v = item.get('vin', '').strip().upper()
            if v in wh_map:
                raw_wh = wh_map[v][1] or ""
                item['current_physical_warehouse'] = clean_location_name(raw_wh)
                item['raw_physical_warehouse'] = raw_wh
            else:
                item['current_physical_warehouse'] = 'Đang vận tải'
                item['raw_physical_warehouse'] = ''

    conn.close()
    return {
        "success": True,
        "total": total_count,
        "count": len(results),
        "limit": limit,
        "offset": offset,
        "cars": results
    }

def get_cyber_ton_kho_report(params: dict) -> dict:
    from_date = (params.get("fromDate") or "2025-07-01").replace("-", "")
    to_date = (params.get("toDate") or datetime.now().strftime("%Y-%m-%d")).replace("-", "")
    ma_kho = (params.get("warehouse") or "").strip()
    ma_kx = (params.get("model") or "").strip()
    ma_mau = (params.get("color") or "").strip()
    status = (params.get("status") or "all").strip()
    keyword = (params.get("keyword") or "").strip().lower()

    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=60
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=60)
        is_pymssql = False

    c = conn.cursor()
    ph = "%s" if is_pymssql else "?"

    sql = f"""
    EXECUTE [dbo].[CP_BETONXE]
        @M_Ma_Kho = {ph},
        @M_Ma_Kx = {ph},
        @M_Ngay_Ct1 = {ph},
        @M_Ngay_Ct2 = {ph},
        @M_Ma_Mau = {ph},
        @M_Nh_Kx1 = N'',
        @M_Nh_Kx2 = N'',
        @M_Nh_Kx3 = N'',
        @M_Ct_Dc = N'1',
        @M_Group1 = N'',
        @M_Group2 = N'',
        @M_Group3 = N'',
        @M_Cp_Name = N'CP_BETONXE',
        @M_Ma_ttcp1 = N'',
        @M_Ma_ttcp2 = N'',
        @M_Ma_TTCP = N'',
        @M_Loai_BC = N'',
        @M_Ma_Dvcs = N'02',
        @M_User_Name = N'02.NHANPT'
    """
    c.execute(sql, (ma_kho, ma_kx, from_date, to_date, ma_mau))
    rows = c.fetchall()
    cols = [d[0] for d in c.description]
    all_items = [dict(zip(cols, r)) for r in rows]
    conn.close()

    # Filter detail rows only
    detail_cars = [d for d in all_items if d.get('So_Khung') and str(d.get('Bold') or '').strip() != '1']

    warehouses_map = {}
    models_set = set()
    for d in detail_cars:
        w_code = (d.get('Ma_kho') or '').strip()
        w_name = (d.get('Ten_Kho') or d.get('ten_kho') or w_code).strip()
        if w_code or w_name:
            warehouses_map[w_code] = w_name
        m_name = (d.get('Ten_Kx') or d.get('Ma_Kx') or '').strip()
        if m_name:
            models_set.add(m_name)

    filtered = []
    for d in detail_cars:
        vin = (d.get('So_Khung') or '').strip()
        so_may = (d.get('So_May') or '').strip()
        so_hd = (d.get('So_HD') or '').strip()
        ten_kx = (d.get('Ten_Kx') or d.get('Ma_Kx') or '').strip()
        tinh_trang = (d.get('Tinh_trang') or '').strip()
        is_invoiced = bool(tinh_trang)

        if status == 'invoiced' and not is_invoiced:
            continue
        if status == 'not_invoiced' and is_invoiced:
            continue

        if keyword:
            match = (
                keyword in vin.lower() or
                keyword in so_may.lower() or
                keyword in so_hd.lower() or
                keyword in ten_kx.lower() or
                keyword in (d.get('Ten_mau') or '').lower() or
                keyword in (d.get('Ten_Kho') or d.get('ten_kho') or '').lower() or
                keyword in (d.get('note') or '').lower()
            )
            if not match:
                continue

        ngay_hd = d.get('Ngay_HD') or d.get('Ngay_Ct')
        ngay_hd_str = str(ngay_hd)[:10] if ngay_hd and not str(ngay_hd).startswith('1900') else ''
        thang_hd = (d.get('Thang_HD') or d.get('Thang_ct') or '').strip()

        ngay_ton = 0
        try:
            ngay_ton = int(float(d.get('Ngay_Ton') or 0))
        except Exception:
            pass

        nam_sx = 0
        try:
            nam_sx = int(float(d.get('Nam_SX') or 0))
        except Exception:
            pass

        filtered.append({
            "vin": vin,
            "so_may": so_may,
            "so_hd": so_hd,
            "ngay_hd": ngay_hd_str,
            "thang_hd": thang_hd,
            "ma_kx": (d.get('Ma_Kx') or '').strip(),
            "ten_kx": ten_kx,
            "ma_mau": (d.get('Ma_Mau') or '').strip(),
            "ten_mau": (d.get('Ten_Mau') or d.get('Ten_mau') or '').strip(),
            "ma_mau_nt": (d.get('Ma_MauNT') or '').strip(),
            "ten_mau_nt": (d.get('Ten_MauNT') or '').strip(),
            "ma_kho": (d.get('Ma_kho') or '').strip(),
            "ten_kho": (d.get('Ten_Kho') or d.get('ten_kho') or '').strip(),
            "ngay_ton": ngay_ton,
            "nam_sx": nam_sx,
            "tinh_trang": tinh_trang,
            "is_invoiced": is_invoiced,
            "ten_ttcp": (d.get('Ten_TTCP_HDX') or '').strip(),
            "tvbh": (d.get('Ten_TVBH') or '').strip(),
            "ghi_chu": (d.get('note') or '').strip()
        })

    total_cars = len(filtered)
    invoiced_count = sum(1 for c in filtered if c['is_invoiced'])
    not_invoiced_count = total_cars - invoiced_count

    return {
        "success": True,
        "total": total_cars,
        "invoiced_count": invoiced_count,
        "not_invoiced_count": not_invoiced_count,
        "cars": filtered,
        "warehouses": [{"code": k, "name": v} for k, v in sorted(warehouses_map.items())],
        "models": sorted(list(models_set))
    }

def get_cyber_xep_xe_contracts(params: dict = {}) -> dict:
    today = date.today()
    thang1 = int(params.get("thang1") or today.month)
    nam1 = int(params.get("nam1") or today.year)
    thang2 = int(params.get("thang2") or today.month)
    nam2 = int(params.get("nam2") or today.year)
    ma_dvcs = (params.get("ma_dvcs") or "02").strip()
    user_name = (params.get("user_name") or "02.NHANPT").strip()
    ma_kx = (params.get("ma_kx") or "").strip()
    ma_mau = (params.get("ma_mau") or "").strip()
    ma_kh = (params.get("ma_kh") or "").strip()
    ma_hd = (params.get("ma_hd") or "").strip()
    m_all = (params.get("all") or "1").strip()
    is_xep_xe = (params.get("is_xep_xe") or "").strip()

    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=60,
            autocommit=True
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=60)
        is_pymssql = False

    c = conn.cursor()
    ph = "%s" if is_pymssql else "?"

    sql = f"""
    EXECUTE [dbo].[CP_BeXepXe]
        @M_Load = N'',
        @M_ALL = {ph},
        @M_Is_Xep_Xe = {ph},
        @M_Thang1 = {ph},
        @M_Nam1 = {ph},
        @M_Thang2 = {ph},
        @M_Nam2 = {ph},
        @M_Stt_Rec = N'',
        @M_Stt_Rec0 = N'',
        @M_Ma_KX = {ph},
        @M_Ma_Mau = {ph},
        @M_Ma_KH = {ph},
        @M_Ma_HD = {ph},
        @M_Nh_HD1 = N'',
        @M_Nh_HD2 = N'',
        @M_Nh_HD3 = N'',
        @M_Ma_DVCS = {ph},
        @M_User_name = {ph}
    """
    c.execute(sql, (
        m_all,
        is_xep_xe,
        thang1,
        nam1,
        thang2,
        nam2,
        ma_kx,
        ma_mau,
        ma_kh,
        ma_hd,
        ma_dvcs,
        user_name
    ))

    rows = c.fetchall()
    cols = [d[0] for d in c.description]

    contracts = []
    status_counts = {}
    showrooms_set = set()
    models_set = set()

    for r in rows:
        d = dict(zip(cols, r))

        def fmt_dt(val):
            if not val:
                return ''
            if isinstance(val, (datetime, date)):
                return val.strftime('%Y-%m-%d')
            return str(val).strip()

        def fmt_num(val):
            if val is None:
                return 0
            try:
                return float(val)
            except Exception:
                return 0

        ngay_ct = fmt_dt(d.get('ngay_ct'))
        ngay_gx = fmt_dt(d.get('Ngay_Gx'))
        ngay_xep = fmt_dt(d.get('Ngay_Xep'))

        tien_nt = fmt_num(d.get('Tien_Nt'))
        da_tt = fmt_num(d.get('Da_TT'))
        con_no = tien_nt - da_tt

        ten_color = (d.get('Ten_Color') or '').strip()
        back_color = (d.get('BackColor') or '').strip()
        fore_color = (d.get('ForeColor') or '').strip()
        bold = bool(d.get('Bold'))

        ten_ttcp = (d.get('Ten_ttcp') or '').strip()
        if ten_ttcp:
            showrooms_set.add(ten_ttcp)

        ten_kx = (d.get('ten_Kx') or d.get('Ma_Kx') or '').strip()
        if ten_kx:
            models_set.add(ten_kx)

        if ten_color:
            status_counts[ten_color] = status_counts.get(ten_color, 0) + 1

        contracts.append({
            "stt_rec": (d.get('stt_rec') or '').strip(),
            "stt_rec0": (d.get('stt_rec0') or '').strip(),
            "so_ct": (d.get('so_ct') or '').strip(),
            "ma_hd": (d.get('ma_hd') or '').strip(),
            "ma_post": (str(d.get('Ma_Post') or d.get('ma_post') or '')).strip(),
            "ngay_ct": ngay_ct,
            "ngay_gx": ngay_gx,
            "ten_kh": (d.get('Ten_Kh') or '').strip(),
            "dien_thoai": (d.get('Dien_Thoai') or '').strip(),
            "ma_kx": (d.get('Ma_Kx') or '').strip(),
            "ten_kx": ten_kx,
            "ma_mau": (d.get('ma_mau') or '').strip(),
            "ten_mau": (d.get('Ten_mau') or '').strip(),
            "ma_mau_nt": (d.get('Ma_Mau_Nt') or '').strip(),
            "ten_mau_nt": (d.get('Ten_mau_nt') or '').strip(),
            "so_khung": (d.get('So_khung') or '').strip(),
            "ngay_xep": ngay_xep,
            "tien_nt": tien_nt,
            "da_tt": da_tt,
            "con_no": con_no,
            "ten_ttcp": ten_ttcp,
            "ma_dvcs": (d.get('ma_dvcs') or '').strip(),
            "ten_hs": (d.get('Ten_Hs') or '').strip(),
            "ten_bp": (d.get('Ten_Bp') or '').strip(),
            "ten_color": ten_color,
            "ma_color": (d.get('Ma_Color') or '').strip(),
            "back_color": back_color,
            "fore_color": fore_color,
            "bold": bold
        })

    conn.close()

    # Lọc theo Showroom nếu người dùng yêu cầu (Mặc định tải TVBH tại Showroom Thuận An)
    target_showroom = (params.get("showroom") or "").strip()
    if target_showroom and target_showroom.lower() not in ['all', 'tất cả']:
        import unicodedata
        def no_accents(s):
            return "".join(ch for ch in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(ch) != 'Mn')
        norm_target = no_accents(target_showroom)
        contracts = [c for c in contracts if norm_target in no_accents(c.get('ten_ttcp', ''))]
        status_counts = {}
        for c in contracts:
            tc = c.get('ten_color')
            if tc:
                status_counts[tc] = status_counts.get(tc, 0) + 1

    return {
        "success": True,
        "total": len(contracts),
        "status_counts": status_counts,
        "showrooms": sorted(list(showrooms_set)),
        "models": sorted(list(models_set)),
        "contracts": contracts
    }

def get_cyber_xep_xe_candidates(params: dict = {}) -> dict:
    stt_rec = (params.get("stt_rec") or "").strip()
    stt_rec0 = (params.get("stt_rec0") or "").strip()
    ma_dvcs = (params.get("ma_dvcs") or "02").strip()
    user_name = (params.get("user_name") or "02.NHANPT").strip()

    if not stt_rec or not stt_rec0:
        return {"success": False, "error": "Thiếu stt_rec hoặc stt_rec0", "candidates": []}

    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30,
            autocommit=True
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)
        is_pymssql = False

    c = conn.cursor()
    ph = "%s" if is_pymssql else "?"

    sql = f"""
    EXECUTE [dbo].[CP_BeXepXe_SK]
        @M_Load = N'0',
        @M_Stt_Rec = {ph},
        @M_Stt_Rec0 = {ph},
        @M_Ma_DVCS = {ph},
        @M_User_name = {ph}
    """
    c.execute(sql, (stt_rec, stt_rec0, ma_dvcs, user_name))
    rows = c.fetchall()
    cols = [d[0] for d in c.description]

    candidates = []
    for r in rows:
        d = dict(zip(cols, r))
        ngay_ct_val = d.get('Ngay_CT') or d.get('Ngay_Ct')
        if isinstance(ngay_ct_val, (datetime, date)):
            ngay_ct_str = ngay_ct_val.strftime('%Y-%m-%d')
        else:
            ngay_ct_str = str(ngay_ct_val or '').strip()

        nam_sx_val = 0
        try:
            nam_sx_val = int(float(d.get('Nam_SX') or 0))
        except Exception:
            pass

        candidates.append({
            "so_khung": (d.get('So_khung') or '').strip(),
            "so_may": (d.get('So_May') or '').strip(),
            "nam_sx": nam_sx_val,
            "ngay_ct": ngay_ct_str,
            "dien_giai": (d.get('Dien_Giai') or '').strip(),
            "ma_kx": (d.get('ma_kx') or '').strip(),
            "ma_mau_nt": (d.get('Ma_Mau_NT') or '').strip(),
            "chua_xep": (d.get('Chua_Xep') or '').strip()
        })

    conn.close()
    return {
        "success": True,
        "total": len(candidates),
        "candidates": candidates
    }

def save_cyber_xep_xe(params: dict = {}) -> dict:
    ma_hd = (params.get("ma_hd") or "").strip()
    stt_rec = (params.get("stt_rec") or "").strip()
    stt_rec0 = (params.get("stt_rec0") or "").strip()
    so_khung = (params.get("so_khung") or "").strip()
    ma_dvcs = (params.get("ma_dvcs") or "02").strip()
    user_name = (params.get("user_name") or "SYSTEM").strip()

    if not ma_hd or not stt_rec or not stt_rec0 or not so_khung:
        return {"success": False, "error": "Thiếu thông tin số HĐ, stt_rec hoặc số khung"}

    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30,
            autocommit=True
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)
        is_pymssql = False

    c = conn.cursor()
    ph = "%s" if is_pymssql else "?"

    sql = f"""
    EXECUTE [dbo].[CP_BeXepXe_SAVE]
        @M_Ma_HD = {ph},
        @M_Stt_Rec = {ph},
        @M_Stt_Rec0 = {ph},
        @M_So_Khung = {ph},
        @M_Ma_DVCS = {ph},
        @M_User_name = {ph}
    """
    c.execute(sql, (ma_hd, stt_rec, stt_rec0, so_khung, ma_dvcs, user_name))
    row = c.fetchone()
    cols = [d[0] for d in c.description]
    res_dict = dict(zip(cols, row))
    conn.close()

    status = (res_dict.get('Status') or '').strip().upper()
    note = (res_dict.get('Note') or '').strip()
    msg = (res_dict.get('Msg') or '').strip()

    if status == 'Y':
        return {
            "success": True,
            "message": f"Đã ghép thành công xe {so_khung} cho hợp đồng {ma_hd}",
            "status": status,
            "note": note,
            "msg": msg
        }
    else:
        return {
            "success": False,
            "error": note or "Không thể ghép xe",
            "status": status,
            "note": note,
            "msg": msg
        }

def delete_cyber_xep_xe(params: dict = {}) -> dict:
    ma_hd = (params.get("ma_hd") or "").strip()
    stt_rec = (params.get("stt_rec") or "").strip()
    stt_rec0 = (params.get("stt_rec0") or "").strip()
    so_khung = (params.get("so_khung") or "").strip()
    ma_dvcs = (params.get("ma_dvcs") or "02").strip()
    user_name = (params.get("user_name") or "SYSTEM").strip()

    if not ma_hd or not stt_rec0 or not so_khung:
        return {"success": False, "error": "Thiếu thông tin số HĐ hoặc số khung để hủy ghép"}

    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30,
            autocommit=True
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)
        is_pymssql = False

    c = conn.cursor()
    ph = "%s" if is_pymssql else "?"

    sql = f"""
    EXECUTE [dbo].[CP_BeXepXe_DELETE]
        @M_Ma_HD = {ph},
        @M_Stt_Rec = {ph},
        @M_Stt_Rec0 = {ph},
        @M_So_Khung = {ph},
        @M_Ma_DVCS = {ph},
        @M_User_name = {ph}
    """
    c.execute(sql, (ma_hd, stt_rec, stt_rec0, so_khung, ma_dvcs, user_name))
    row = c.fetchone()
    cols = [d[0] for d in c.description]
    res_dict = dict(zip(cols, row))
    conn.close()

    status = (res_dict.get('Status') or '').strip().upper()
    note = (res_dict.get('Note') or '').strip()
    msg = (res_dict.get('Msg') or '').strip()

    if status == 'Y':
        return {
            "success": True,
            "message": f"Đã hủy ghép xe {so_khung} khỏi hợp đồng {ma_hd}",
            "status": status,
            "note": note,
            "msg": msg
        }
    else:
        return {
            "success": False,
            "error": note or "Không thể hủy ghép xe",
            "status": status,
            "note": note,
            "msg": msg
        }

def main():
    parser = argparse.ArgumentParser(description="Sync Thuan An car allocations from CyberSoft to Supabase")
    parser.add_argument("--from", dest="from_date", help="From date (YYYY-MM-DD)", default=None)
    parser.add_argument("--to", dest="to_date", help="To date (YYYY-MM-DD)", default=None)
    parser.add_argument("--preview", action="store_true", help="Preview without writing")
    parser.add_argument("--sync-locations", action="store_true", help="Sync physical locations from CT70BEX into khoxe")
    parser.add_argument("--plan-filter-options", action="store_true", help="Get distinct showrooms and colors for plan search")
    parser.add_argument("--search-plan", action="store_true", help="Search factory delivery plan")
    parser.add_argument("--ton-kho-report", action="store_true", help="Get Ton Kho Xe report from CyberSoft CP_BETONXE")
    parser.add_argument("--xep-xe-contracts", action="store_true", help="Get contracts list from CP_BeXepXe")
    parser.add_argument("--xep-xe-candidates", action="store_true", help="Get candidate cars for a contract from CP_BeXepXe_SK")
    parser.add_argument("--xep-xe-save", action="store_true", help="Assign vehicle to contract via CP_BeXepXe_SAVE")
    parser.add_argument("--xep-xe-delete", action="store_true", help="Unassign vehicle from contract via CP_BeXepXe_DELETE")
    parser.add_argument("--model", help="Car model filter for options", default="")
    parser.add_argument("--params", help="JSON string of search parameters", default=None)
    args = parser.parse_args()

    if args.plan_filter_options:
        res = get_cyber_plan_filter_options(model=args.model or "")
        print(json.dumps(res, ensure_ascii=False))
        return

    def get_input_params():
        if args.params and args.params.strip() != "-":
            try:
                return json.loads(args.params)
            except Exception:
                pass
        if not sys.stdin.isatty():
            try:
                raw = sys.stdin.buffer.read()
                if raw:
                    for enc in ['utf-8-sig', 'utf-8', 'utf-16', 'utf-16-le', 'cp1258']:
                        try:
                            text = raw.decode(enc).strip()
                            if text.startswith('{') or text.startswith('['):
                                return json.loads(text)
                        except Exception:
                            continue
            except Exception:
                pass
            try:
                stdin_data = sys.stdin.read().strip()
                if stdin_data:
                    return json.loads(stdin_data)
            except Exception:
                pass
        return {}

    if args.sync_locations:
        p = get_input_params()
        res = sync_khoxe_locations_from_cyber(target_vins=p.get("vins"), preview=args.preview)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.ton_kho_report:
        p = get_input_params()
        res = get_cyber_ton_kho_report(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.xep_xe_contracts:
        p = get_input_params()
        res = get_cyber_xep_xe_contracts(p)
        print(json.dumps(res, ensure_ascii=False))
        return

def create_cyber_dnx_ticket(params: dict = {}) -> dict:
    vins = params.get("vins") or []
    if not vins and params.get("vin"):
        vins = [params.get("vin")]

    ma_kho_xuat = (params.get("ma_kho_xuat") or params.get("ma_kho_i") or "K87").strip()
    ma_kho_nhan = (params.get("ma_kho_nhan") or params.get("ma_khoN_i") or "K83").strip()
    khach_hang  = (params.get("khach_hang") or params.get("ong_ba") or "").strip()
    ly_do       = (params.get("ly_do") or params.get("dien_giai") or "Điều chuyển xe nội bộ").strip()
    ma_dvcs     = (params.get("ma_dvcs") or "02").strip()
    ma_ttcp     = (params.get("ma_ttcp") or "02.01.20").strip()
    user_name   = (params.get("user_name") or "02.NHANPT").strip()

    if not vins:
        return {"success": False, "error": "Vui lòng chọn ít nhất một xe (số VIN) để lập phiếu đề nghị xuất"}

    is_pymssql = True
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30,
            autocommit=True
        )
    except Exception:
        import pyodbc
        conn = pyodbc.connect(CYBER_CONN, timeout=30)
        is_pymssql = False

    cursor = conn.cursor(as_dict=True) if is_pymssql else conn.cursor()
    ph = "%s" if is_pymssql else "?"

    # 1. Tra cứu user_id từ UserInfo
    user_id = 289
    try:
        cursor.execute(f"SELECT user_id FROM UserInfo WHERE user_name = {ph}", (user_name,))
        r = cursor.fetchone()
        if r:
            user_id = r.get('user_id') if is_pymssql else r[0]
    except Exception:
        pass

    # 2. Sinh số chứng từ so_ct bằng CP_SysGetnoVoucherDNX
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d 00:00:00")
    today_date = today.strftime("%Y%m%d")

    so_ct = ""
    try:
        cursor.execute(f"EXEC CP_SysGetnoVoucherDNX 'L', '', '', {ph}, {ph}, 'DNX', {ph}, {ph}, {ph}", (today_date, today_date, ma_ttcp, ma_dvcs, user_name))
        r_so = cursor.fetchone()
        if r_so:
            so_ct = (r_so.get('So_ct') or r_so.get('So_Ct')) if is_pymssql else r_so[0]
    except Exception as e:
        print(f"[Create DNX warning] CP_SysGetnoVoucherDNX: {e}", file=sys.stderr)

    if not so_ct:
        year_two = today.strftime("%y")
        month_two = today.strftime("%m")
        ttcp_two = ma_ttcp.split('.')[-1] if '.' in ma_ttcp else ma_ttcp[-2:]
        prefix = f"{ttcp_two}.DNX{year_two}{month_two}."
        cursor.execute(f"SELECT MAX(so_ct) as max_so FROM PHDNX WHERE so_ct LIKE {ph}", (f"{prefix}%",))
        r_max = cursor.fetchone()
        max_so = (r_max.get('max_so') if is_pymssql else r_max[0]) if r_max else None
        if max_so and max_so.startswith(prefix):
            try:
                num = int(max_so.split('.')[-1]) + 1
                so_ct = f"{prefix}{num:04d}"
            except Exception:
                so_ct = f"{prefix}0001"
        else:
            so_ct = f"{prefix}0001"

    # 3. Sinh stt_rec duy nhất: A + 7 số + DNX
    cursor.execute("SELECT MAX(stt_rec) as max_stt FROM PHDNX WHERE stt_rec LIKE 'A%DNX'")
    r_stt = cursor.fetchone()
    max_stt = (r_stt.get('max_stt') if is_pymssql else r_stt[0]) if r_stt else None
    if max_stt and len(max_stt) >= 13:
        try:
            num = int(max_stt[1:8]) + 1
            stt_rec = f"A{num:07d}DNX"
        except Exception:
            stt_rec = f"A{int(datetime.now().timestamp()):07d}"[:8] + "DNX"
    else:
        stt_rec = "A000001628DNX"

    # 4. Tra cứu thông tin từng xe trong CT70BEX / DMKX để chèn vào CTDNX
    cars_detail = []
    total_qty = 0
    for idx, vin in enumerate(vins, start=1):
        vin_clean = vin.strip().upper()
        cursor.execute(f"""
            SELECT TOP 1 Ma_Kx, Ma_Mau, So_May, Ma_Kho, Ma_mau_nt
            FROM CT70BEX
            WHERE So_Khung = {ph}
            ORDER BY Ngay_Ct DESC
        """, (vin_clean,))
        car_info = cursor.fetchone() or {}

        if is_pymssql:
            ma_kx = (car_info.get('Ma_Kx') or '').strip()
            ma_mau = (car_info.get('Ma_Mau') or '').strip()
            so_may = (car_info.get('So_May') or '').strip()
            ma_mau_nt = (car_info.get('Ma_mau_nt') or '').strip()
        else:
            ma_kx = (car_info[0] if len(car_info) > 0 else '') or ''
            ma_mau = (car_info[1] if len(car_info) > 1 else '') or ''
            so_may = (car_info[2] if len(car_info) > 2 else '') or ''
            ma_mau_nt = (car_info[4] if len(car_info) > 4 else '') or ''

        stt_rec0 = f"{idx:04d}"

        sql_ct = f"""
        INSERT INTO CTDNX (
            stt_rec, stt_rec0, ma_ct, ngay_ct, so_ct,
            ma_Kx, Ma_Mau, So_khung, So_may, Ma_Vitri,
            Ma_kho_i, tk_vt, ma_nx_i, Ton13, so_luong,
            dvt1, he_so1, so_luong1, gia_nt, gia,
            tien_nt, tien, stt_rec_pn, stt_rec0pn, ma_vv_i,
            ma_hd_i, ma_phi_i, ma_sp_i, MA_Ku_I, Ma_TTLN_I,
            Ma_TTCP_I, Ma_Bp_I, Ma_Hs_I, Ma_Cd_I, Ma_TD1_I,
            Ma_TD2_I, Ma_TD3_I, Ma_TD4_I, Ma_TD5_I, sl_td_i,
            So_Po, So_So, So_Ro, So_Vt, Ma_Lo,
            Han_Sd, Ma_Db_I, ma_khoN_i, Ma_mau_nt, Ma_TTCP_N_i, Dien_giai_i
        ) VALUES (
            {ph}, {ph}, 'DNX', {ph}, {ph},
            {ph}, {ph}, {ph}, {ph}, '',
            {ph}, '1561', '1561', 1.0, 1.0,
            '', 0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, '', '', '',
            '', '', '', '', '',
            {ph}, '', '', '', '',
            '', '', '', '', 0.0,
            '', '', '', '', '',
            '1900-01-01', '', {ph}, {ph}, {ph}, {ph}
        )
        """
        cursor.execute(sql_ct, (
            stt_rec, stt_rec0, today_str, so_ct,
            ma_kx, ma_mau, vin_clean, so_may,
            ma_kho_xuat, ma_ttcp, ma_kho_nhan, ma_mau_nt, ma_ttcp, ly_do
        ))
        total_qty += 1
        cars_detail.append({
            "stt_rec0": stt_rec0,
            "vin": vin_clean,
            "so_may": so_may,
            "ma_kx": ma_kx,
            "ma_mau": ma_mau,
            "ma_kho_xuat": ma_kho_xuat,
            "ma_kho_nhan": ma_kho_nhan
        })

    # 5. Insert Header PHDNX
    sql_ph = f"""
    INSERT INTO PHDNX (
        ma_dvcs, stt_rec, ma_ct, ma_gd, Ma_Post,
        px_gia_dd, MA_QUYEN, ngay_ct, ngay_lct, so_ct,
        Ma_TTCP_H, Ma_TTLN_H, Ma_Hs_H, Ma_Bp_H, so_lo,
        ngay_lo, ma_kh, ong_ba, Dia_Chi, dien_giai,
        t_so_luong, t_soluong1, Ma_kho, Ma_khoN, ma_nt,
        ty_gia, t_tien_nt, t_tien, Lenh_RO, Lenh_PO,
        Lenh_So, NonVat, user_id, Ma_TTCP_N, MA_TD3_H, MA_HD_H
    ) VALUES (
        {ph}, {ph}, 'DNX', '4', '9',
        0, '', {ph}, {ph}, {ph},
        {ph}, '', '', '', '',
        '1900-01-01', '', {ph}, '', {ph},
        {ph}, 0, '', '', 'VND',
        1.0, 0, 0, '', '',
        '', 0, {ph}, '', '', ''
    )
    """
    cursor.execute(sql_ph, (
        ma_dvcs, stt_rec, today_str, today_str, so_ct,
        ma_ttcp, khach_hang, ly_do, total_qty, user_id
    ))

    conn.close()

    return {
        "success": True,
        "message": f"Đã lập thành công Phiếu Đề Nghị Xuất Xe {so_ct} trên CyberSoft ERP",
        "so_ct": so_ct,
        "stt_rec": stt_rec,
        "user_name": user_name,
        "user_id": user_id,
        "total_cars": total_qty,
        "cars": cars_detail
    }

def main():
    parser = argparse.ArgumentParser(description="Sync Thuan An car allocations from CyberSoft to Supabase")
    parser.add_argument("--from", dest="from_date", help="From date (YYYY-MM-DD)", default=None)
    parser.add_argument("--to", dest="to_date", help="To date (YYYY-MM-DD)", default=None)
    parser.add_argument("--preview", action="store_true", help="Preview mode without updating database")
    parser.add_argument("--sync-locations", action="store_true", help="Sync physical locations from CT70BEX into khoxe")
    parser.add_argument("--plan-filter-options", action="store_true", help="Get distinct showrooms and colors for plan search")
    parser.add_argument("--search-plan", action="store_true", help="Search factory delivery plan")
    parser.add_argument("--ton-kho-report", action="store_true", help="Get Ton Kho Xe report from CyberSoft CP_BETONXE")
    parser.add_argument("--xep-xe-contracts", action="store_true", help="Get contracts list from CP_BeXepXe")
    parser.add_argument("--xep-xe-candidates", action="store_true", help="Get candidate cars for a contract from CP_BeXepXe_SK")
    parser.add_argument("--xep-xe-save", action="store_true", help="Assign vehicle to contract via CP_BeXepXe_SAVE")
    parser.add_argument("--xep-xe-delete", action="store_true", help="Unassign vehicle from contract via CP_BeXepXe_DELETE")
    parser.add_argument("--create-dnx", action="store_true", help="Create Cyber Transfer Request document (DNX)")
    parser.add_argument("--model", help="Car model filter for options", default="")
    parser.add_argument("--params", help="JSON string of search parameters", default=None)
    args = parser.parse_args()

    def get_input_params():
        if args.params:
            try:
                return json.loads(args.params)
            except Exception:
                pass
        if not sys.stdin.isatty():
            try:
                raw = sys.stdin.buffer.read()
                if raw:
                    for enc in ['utf-8-sig', 'utf-8', 'utf-16', 'utf-16-le', 'cp1258']:
                        try:
                            text = raw.decode(enc).strip()
                            if text.startswith('{') or text.startswith('['):
                                return json.loads(text)
                        except Exception:
                            continue
            except Exception:
                pass
            try:
                stdin_data = sys.stdin.read().strip()
                if stdin_data:
                    return json.loads(stdin_data)
            except Exception:
                pass
        return {}

    if args.sync_locations:
        p = get_input_params()
        target_vins = p.get("vins") if isinstance(p, dict) and "vins" in p else None
        preview = p.get("preview", False) if isinstance(p, dict) else args.preview
        res = sync_khoxe_locations_from_cyber(target_vins=target_vins, preview=preview)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.plan_filter_options:
        res = get_cyber_plan_filter_options(args.model)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.ton_kho_report:
        p = get_input_params()
        res = get_cyber_ton_kho_report(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.xep_xe_contracts:
        p = get_input_params()
        res = get_cyber_xep_xe_contracts(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.xep_xe_candidates:
        p = get_input_params()
        res = get_cyber_xep_xe_candidates(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.xep_xe_save:
        p = get_input_params()
        res = save_cyber_xep_xe(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.xep_xe_delete:
        p = get_input_params()
        res = delete_cyber_xep_xe(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.create_dnx:
        p = get_input_params()
        res = create_cyber_dnx_ticket(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    if args.search_plan:
        p = get_input_params()
        res = search_cyber_factory_plan(p)
        print(json.dumps(res, ensure_ascii=False))
        return

    today = date.today()
    from_date = args.from_date or today.replace(day=1).strftime("%Y-%m-%d")
    to_date = args.to_date or today.strftime("%Y-%m-%d")

    raw_cars = fetch_allocations_from_cyber(from_date, to_date)
    raw_vins = [c.get("vin", "").strip().upper() for c in raw_cars if c.get("vin")]
    plan_map = fetch_plan_map(raw_vins)
    mapped_cars = [map_allocation_to_khoxe(c, plan_map) for c in raw_cars if c.get("vin")]

    if args.preview:
        output = {
            "success": True,
            "mode": "preview",
            "from_date": from_date,
            "to_date": to_date,
            "total": len(mapped_cars),
            "cars": mapped_cars
        }
        print(json.dumps(output, ensure_ascii=False))
        return

    ok, fail = upsert_to_supabase_khoxe(mapped_cars)

    output = {
        "success": fail == 0,
        "mode": "sync",
        "from_date": from_date,
        "to_date": to_date,
        "total": len(mapped_cars),
        "success_count": ok,
        "fail_count": fail,
        "cars": mapped_cars[:10],
        "vins": [c["vin"] for c in mapped_cars]
    }
    print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    main()

