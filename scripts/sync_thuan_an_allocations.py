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
    "VF3":      ("VF 3",   ""),
    "VF301":    ("VF 3",   "Tiêu chuẩn 1 màu"),
    "VF302":    ("VF 3",   "Tiêu chuẩn 2 màu"),
    "VF304":    ("VF 3",   "Nâng cao 2 màu"),
    "VF305":    ("VF 3",   "Plus tiêu chuẩn 2 màu"),
    "VF306":    ("VF 3",   "Plus nâng cao 2 màu"),
    "VF2":      ("VF 2",   "Màu cơ bản"),
    "VF201":    ("VF 2",   "Màu nâng cao"),
    "VF5":      ("VF 5",   ""),
    "VF501":    ("VF 5",   "Plus cơ bản"),
    "VF503":    ("VF 5",   "Plus nâng cao"),
    "VF504":    ("VF 5",   "Plus"),
    "VF6":      ("VF 6",   ""),
    "VF601":    ("VF 6",   "Eco"),
    "VF603":    ("VF 6",   "Eco"),
    "VF604":    ("VF 6",   "Plus"),
    "VF605":    ("VF 6",   "Plus"),
    "VF608":    ("VF 6",   "Plus"),
    "VF609":    ("VF 6",   "Plus nâng cao"),
    "VF7":      ("VF 7",   ""),
    "VF706":    ("VF 7",   "Eco Tiêu chuẩn 2"),
    "VF707":    ("VF 7",   "Plus trần thép 1 cầu"),
    "VF713":    ("VF 7",   "Eco HUD"),
    "VF8":      ("VF 8",   ""),
    "VF8THM":   ("VF 8",   "Thế hệ mới"),
    "VF8 S":    ("VF 8",   "Eco"),
    "VF9":      ("VF 9",   ""),
    "PE1U01":   ("VF 9",   "Eco"),
    "PE1U06":   ("VF 9",   "Plus 7 chỗ CATL"),
    "LIMO":     ("VF e34", "Limo Green"),
    "ECVANNC":  ("EC Van", "Nâng cao"),
    "MinioGreen": ("Minio", "Green"),
    "VFMPV7":   ("VF MPV 7", ""),
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

    # Chỉ lấy xe chưa xuất hóa đơn bán (Ngay_HD_Ban trống hoặc 1900-01-01)
    base_where = "k.Ma_ct IN ('K10', 'K15') AND (k.Ngay_HD_Ban IS NULL OR k.Ngay_HD_Ban <= '1900-01-01') AND k.So_khung IS NOT NULL AND RTRIM(LTRIM(k.So_khung)) <> ''"

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

    # 3. Distinct Colors (theo dòng xe nếu có)
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
    return {"success": True, "ttcp_list": ttcp_list, "models": models, "colors": colors}

def search_cyber_factory_plan(params: dict) -> dict:
    keyword = (params.get("keyword") or "").strip()
    model = (params.get("model") or "").strip()
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
    # Bắt buộc: chỉ lấy xe chưa xuất hóa đơn bán (Ngay_HD_Ban trống), toàn bộ K10+K15
    where_clauses = [
        "k.Ma_ct IN ('K10', 'K15')",
        "k.So_khung IS NOT NULL",
        "RTRIM(LTRIM(k.So_khung)) <> ''",
        "(k.Ngay_HD_Ban IS NULL OR k.Ngay_HD_Ban <= '1900-01-01')"
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

    if color and color != 'Tất cả':
        where_clauses.append(f"(k.Ma_Mau LIKE {ph} OR mx.ten_mau LIKE {ph})")
        c_like = f"%{color}%"
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

def main():
    parser = argparse.ArgumentParser(description="Sync Thuan An car allocations from CyberSoft to Supabase")
    parser.add_argument("--from", dest="from_date", help="From date (YYYY-MM-DD)", default=None)
    parser.add_argument("--to", dest="to_date", help="To date (YYYY-MM-DD)", default=None)
    parser.add_argument("--preview", action="store_true", help="Preview without writing")
    parser.add_argument("--sync-locations", action="store_true", help="Sync physical locations from CT70BEX into khoxe")
    parser.add_argument("--plan-filter-options", action="store_true", help="Get distinct showrooms and colors for plan search")
    parser.add_argument("--search-plan", action="store_true", help="Search factory delivery plan")
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
