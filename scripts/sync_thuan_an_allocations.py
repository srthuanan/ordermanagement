import sys
import argparse
import json
import os
import requests
import re
from datetime import datetime, date, timezone
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

CYBER_CONN = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=SQLVanDao.Cybersoft.com.vn,7521;"
    "DATABASE=CyberAppGolden_VanDao;"
    "UID=cyber_vandao;"
    "PWD=HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv;"
    "TrustServerCertificate=yes;"
    "APP=CyberAppGolden;"
    "Workstation ID=CyberAppServer-Internal"
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
    "LIMO":       ("LIMO",   "LIMO"),
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

# Bảng ánh xạ chính xác Mã màu Ngoại thất Cyber sang Tên màu chuẩn Web App (constants.ts)
WEB_EXTERIOR_COLORS = {
    # 1 màu
    "CE11": "Jet Black (CE11)",
    "CE18": "Brahminy White (CE18)",
    "CE17": "Silver (CE17)",
    "CE2Q": "Solar Ruby (CE2Q)",
    "CE1W": "Urbant Mint (CE1W)",
    "CE1V": "Zenith Grey (CE1V)",
    "CE1U": "Summer Yellow (CE1U)",
    "CE1M": "Crimson Red (CE1M)",
    "CE1N": "Vinfast Blue (CE1N)",
    "CE14": "Neptune Grey (CE14)",
    "CE1J": "Electric Blue (CE1J)",
    "CE1H": "Deep Ocean (CE1H)",
    "CE1A": "Sunset ORB (CE1A)",
    "CE1X": "Iris Berry (CE1X)",
    "CE21": "Rose Pink (CE21)",
    "CE2G": "Sky Blue (CE2G)",
    "CE2T": "Pebble Beige (CE2T)",
    "CE2K": "Pink Gold (CE2K)",
    "CE2J": "Moonlit Ocean (CE2J)",
    "CE2N": "Introspective Brown (CE2N)",
    "CE2O": "Mysterioso Purple (CE2O)",
    "CE22": "Ivy_Green_GNE (CE22)",
    "CE23": "Champagne_Creme_YLG (CE23)",
    "CE2B": "Vinbus Green (CE2B)",
    "CE32": "Vitality Orange (CE32)",
    "CE33": "Starburst Blue (CE33)",

    # 2 màu (phối nóc)
    "111U": "Jet Black Roof- Summer Yellow Body (111U)",
    "181U": "Brahminy White Roof- Summer Yellow Body (181U)",
    "181Y": "Brahminy White Roof- Aquatic Azure Body (181Y)",
    "1821": "Brahminy White Roof- Rose Pink Body (1821)",
    "181X": "Brahminy White Roof - Iris Berry Body (181X)",
    "111M": "Crimson Red - Jet Black Roof (111M)",
    "111H": "Deep Ocean_Jet Black Roof (111H)",
    "112Q": "Solar Ruby Body - Jet Black Roof (112Q)",
    "1132": "Vitality Orange Body - Jet Black Roof (1132)",
    "171V": "Zenith Grey-desat Silver Roof (171V)",
    "171W": "Urbant Mint Green - Desat Silv (171W)",
    "1722": "Ivy Green-desat Silver Roof (1722)",
    "1833": "Starburst Blue Body - Infinity Blanc Roof (1833)",
    "1832": "Vitality Orange Body - Infinity Blanc Roof (1832)",
    "312O": "Mysterioso Purple Body - Stealth Gray Roof (312O)",
    "3111": "Jet Black Body - Stealth Gray Roof (3111)",
    "1V18": "Infinity Blanc_Zenith Grey Roof (1v18)",
    "1823": "Champagne Creme_Infinity Blanc Roof (1823)",
    "182G": "Infinity Blanc Roof-Sky Blue (182G)",
    "2911": "Jet Black_Mystery Bronze Roof (2911)",
    "2811": "Jet Black - Graphite Roof (2811)",
    "2523": "Champagne Creme - Matte Champa (2523)",
    "2418": "Infinity Blanc _ Silky White R (2418)",
    "2311": "Jet Black-Champagne Creme Roof (2311)",
    "1Y26": "Atlantic Blue-Aquatic Azure Ro (1Y26)",
    "2A26": "Alantic Blue_Denim Blue Roof (2A26)",
    "2927": "Crimson Velvet - Mystery Bronz (2927)",
}

OFFICIAL_COLOR_NAMES = WEB_EXTERIOR_COLORS

def format_color_by_code(ma_mau: str, ten_mau_cyber: str = "") -> str:
    code = (ma_mau or "").strip().upper()
    name = (ten_mau_cyber or "").strip()
    
    # 1. Ưu tiên khớp chính xác với danh mục màu trên Web App
    if code in WEB_EXTERIOR_COLORS:
        return WEB_EXTERIOR_COLORS[code]

    # 2. Nếu là mã mới chưa có trên Web, dùng tên từ Cyber dmMauxe
    if name:
        clean_name = name.title() if name.isupper() else name
        if clean_name.lower().startswith("màu "):
            clean_name = clean_name[4:].strip()
        return f"{clean_name} ({code})" if code else clean_name

    if code:
        return code
    return "-"

def format_interior_color_by_code(ma_mau_nt: str, ten_mau_nt_cyber: str = "") -> str:
    code = (ma_mau_nt or "").strip().upper()
    name = (ten_mau_nt_cyber or "").strip().lower()

    # Khớp chính xác 4 màu nội thất chuẩn trên Web App: Black, Brown, Beige, Grey
    if code in ["CI11", "CI1H", "PO21", "PO25"] or "đen" in name or "black" in name:
        return "Black"
    if code in ["CI12", "CI18", "PO26"] or "nâu" in name or "brown" in name or "mocha" in name:
        return "Brown"
    if code in ["CI13", "PO27"] or "be" in name or "beige" in name:
        return "Beige"
    if code in ["CI1M"] or "xám" in name or "grey" in name or "gray" in name:
        return "Grey"

    if name:
        clean = name.title()
        if clean.lower().startswith("màu "):
            clean = clean[4:].strip()
        return clean
    return "Black"

COLOR_MAP = WEB_EXTERIOR_COLORS

def fetch_allocations_from_cyber(from_date: str, to_date: str, ttcp_code="02.01.08"):
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30,
            appname='CyberAppGolden',
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
            timeout=30,
            appname='CyberAppGolden',
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
    loai_xe_cyber = (car.get("loai_xe_cyber") or "").strip()
    phien_ban_cyber = (car.get("phien_ban_cyber") or "").strip()

    if ma_kx == "LIMO":
        dong_xe = "LIMO"
        phien_ban = "LIMO"
    elif ma_kx in MODEL_MAP:
        dong_xe, phien_ban = MODEL_MAP[ma_kx]
    elif ma_kx.startswith("VF"):
        dong_xe = "VF " + ma_kx[2:3] if len(ma_kx) >= 3 else ma_kx
        phien_ban = phien_ban_cyber or loai_xe_cyber
    else:
        dong_xe = loai_xe_cyber or ma_kx
        phien_ban = phien_ban_cyber

    ma_mau_ngoai = (car.get("ma_mau_ngoai") or "").strip().upper()
    ten_mau_ngoai = (car.get("ten_mau_ngoai") or "").strip()
    ngoai_that = format_color_by_code(ma_mau_ngoai, ten_mau_ngoai)

    ma_mau_noi = (car.get("ma_mau_noi") or "").strip().upper()
    ten_mau_noi = (car.get("ten_mau_noi") or "").strip()
    clean_noi_that = format_interior_color_by_code(ma_mau_noi, ten_mau_noi)

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
        # Giữ đầy đủ các thông tin gốc CyberSoft để kiểm tra & sửa đổi
        "ma_kx": ma_kx,
        "ten_kx_cyber": loai_xe_cyber,
        "ma_mau": ma_mau_ngoai,
        "ten_mau_cyber": ten_mau_ngoai,
        "ma_mau_noi": ma_mau_noi,
        "ten_mau_noi_cyber": ten_mau_noi,
        "ngoai_that": ngoai_that,
        "noi_that": clean_noi_that or ten_mau_noi,
        "ma_dms": ma_dms,
        "vi_tri": vi_tri,
        "trang_thai": "Chưa ghép",
        "ngay_nhap": ngay_nhap_str,
    }

VALID_KHOXE_FIELDS = {
    "vin", "dong_xe", "phien_ban", "ngoai_that", "noi_that",
    "so_may", "ma_dms", "vi_tri", "trang_thai", "ngay_nhap"
}

def upsert_to_supabase_khoxe(records: list):
    if not records:
        return 0, 0

    url = f"{SUPABASE_URL}/rest/v1/khoxe"
    CHUNK_SIZE = 50
    total_ok = 0
    total_fail = 0

    # Lọc chỉ những cột thực tế tồn tại trong bảng khoxe của Supabase
    clean_records = []
    for r in records:
        rec = {k: v for k, v in r.items() if k in VALID_KHOXE_FIELDS and v is not None}
        if not rec.get("vin"):
            continue
        rec["vin"] = rec["vin"].strip().upper()
        if not rec.get("trang_thai"):
            rec["trang_thai"] = "Chưa ghép"
        clean_records.append(rec)

    for i in range(0, len(clean_records), CHUNK_SIZE):
        chunk = clean_records[i:i + CHUNK_SIZE]
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

    return total_ok, total_fail

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
            timeout=30,
            appname='CyberAppGolden',
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
            timeout=30,
            appname='CyberAppGolden',
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
    keyword = (params.get("keyword") or params.get("so_khung") or "").strip()

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

    rows = []
    cols = []
    direct_matched_stts = set()

    # 1. Tra cứu trực tiếp theo số khung (VIN), số hợp đồng, mã chứng từ, hoặc tên khách hàng
    if keyword:
        try:
            stt_recs_direct = []
            # Tra cứu số khung từ BEXEPXE
            c.execute(f"SELECT TOP 30 Ma_Hd, Stt_Rec0, So_khung FROM dbo.BEXEPXE WITH (NOLOCK) WHERE So_khung LIKE {ph}", ('%' + keyword + '%',))
            bex_matches = c.fetchall()
            hd_candidates = [r[0] for r in bex_matches if r and r[0]]
            if hd_candidates:
                ph_hd = ', '.join([ph] * len(hd_candidates))
                c.execute(f"SELECT DISTINCT stt_rec FROM dbo.CT70HDX WITH (NOLOCK) WHERE ma_hd IN ({ph_hd})", tuple(hd_candidates))
                for sr_row in c.fetchall():
                    if sr_row and sr_row[0] and sr_row[0] not in stt_recs_direct:
                        stt_recs_direct.append(sr_row[0])

            # Tra cứu từ CT70HDX theo ma_hd, so_ct, ten_kh
            c.execute(f"SELECT TOP 30 stt_rec FROM dbo.CT70HDX WITH (NOLOCK) WHERE ma_hd LIKE {ph} OR so_ct LIKE {ph} OR ten_kh LIKE {ph}",
                      ('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%'))
            for sr_row in c.fetchall():
                if sr_row and sr_row[0] and sr_row[0] not in stt_recs_direct:
                    stt_recs_direct.append(sr_row[0])

            if stt_recs_direct:
                direct_sql = f"""
                EXECUTE [dbo].[CP_BeXepXe]
                    @M_Load = N'', @M_ALL = N'1', @M_Is_Xep_Xe = N'',
                    @M_Thang1 = 0, @M_Nam1 = 0, @M_Thang2 = 0, @M_Nam2 = 0,
                    @M_Stt_Rec = {ph}, @M_Stt_Rec0 = N'',
                    @M_Ma_KX = N'', @M_Ma_Mau = N'', @M_Ma_KH = N'', @M_Ma_HD = N'',
                    @M_Nh_HD1 = N'', @M_Nh_HD2 = N'', @M_Nh_HD3 = N'',
                    @M_Ma_DVCS = {ph}, @M_User_name = {ph}
                """
                for sr in stt_recs_direct[:5]:
                    c.execute(direct_sql, (sr, ma_dvcs, user_name))
                    d_res = c.fetchall()
                    if d_res:
                        if not cols:
                            cols = [col[0] for col in c.description]
                        for dr in d_res:
                            rows.append(dr)
                            direct_matched_stts.add(sr)
        except Exception as ex:
            print(f"[get_cyber_xep_xe_contracts direct lookup error]: {ex}", file=sys.stderr)

    # 2. Nếu không tìm theo từ khóa hoặc từ khóa chưa có kết quả trực tiếp: chạy SP theo khoảng thời gian
    if not rows:
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

    try:
        conn.close()
    except Exception:
        pass

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
            "bold": bold,
            "is_direct_match": bool((d.get('stt_rec') or '').strip() in direct_matched_stts)
        })

    conn.close()

    # Lọc theo Showroom nếu người dùng yêu cầu (Mặc định tải TVBH tại Showroom Thuận An)
    target_showroom = (params.get("showroom") or "").strip()
    if target_showroom and target_showroom.lower() not in ['all', 'tất cả']:
        import unicodedata
        def no_accents(s):
            return "".join(ch for ch in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(ch) != 'Mn')
        norm_target = no_accents(target_showroom)
        # Giữ lại các hợp đồng khớp trực tiếp từ từ khóa tìm kiếm (đặc biệt khi tra cứu VIN/HĐ xem SR nào xuất HĐ)
        contracts = [c for c in contracts if c.get('is_direct_match') or norm_target in no_accents(c.get('ten_ttcp', ''))]
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
    ma_ttcp     = (params.get("ma_ttcp") or "02.01.08").strip()
    user_name   = (params.get("user_name") or "02.NHANPT").strip()

    if not vins:
        return {"success": False, "error": "Vui lòng chọn ít nhất một xe (số VIN) để lập phiếu đề nghị xuất"}

    try:
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
                appname='CyberAppGolden',
                    autocommit=True
            )
        except Exception:
            import pyodbc
            conn = pyodbc.connect(CYBER_CONN, timeout=30)
            is_pymssql = False

        cursor = conn.cursor(as_dict=True) if is_pymssql else conn.cursor()
        ph = "%s" if is_pymssql else "?"

        # 0. CHẶN TẠO TRÙNG LẶP: Kiểm tra xem các số VIN đã tồn tại phiếu ĐNX hoặc phiếu TD4 chưa
        vins_clean = [v.strip().upper() for v in vins if v and len(v.strip()) >= 8]
        if vins_clean:
            vin_list_str = ', '.join([f"'{v}'" for v in vins_clean])
            
            # Kiểm tra phiếu ĐNX đã tồn tại
            sql_check_dnx = f"""
                SELECT TOP 1 
                    c.so_khung,
                    p.so_ct,
                    p.stt_rec,
                    p.ngay_ct,
                    p.dien_giai,
                    p.ong_ba AS ten_kh,
                    ISNULL(c.ma_kho_i, p.Ma_kho) AS ma_kho_xuat,
                    ISNULL(c.ma_khoN_i, p.Ma_khoN) AS ma_kho_nhan,
                    c.so_may,
                    c.ma_Kx,
                    c.Ma_Mau
                FROM CTDNX c WITH (NOLOCK)
                JOIN PHDNX p WITH (NOLOCK) ON c.stt_rec = p.stt_rec
                WHERE c.so_khung IN ({vin_list_str})
                  AND (
                      p.Ma_TTCP_H = '02.01.08'
                      OR p.so_ct LIKE '08.DNX%'
                      OR ISNULL(c.ma_khoN_i, p.Ma_khoN) = 'K83'
                  )
                ORDER BY p.ngay_ct DESC, p.so_ct DESC
            """
            cursor.execute(sql_check_dnx)
            r_dup_dnx = cursor.fetchone()
            if r_dup_dnx:
                rd = {str(k).lower(): (v.strftime('%Y-%m-%d') if isinstance(v, (datetime, date)) else str(v or '').strip()) for k, v in r_dup_dnx.items()} if is_pymssql else {
                    'so_khung': str(r_dup_dnx[0] or '').strip(),
                    'so_ct': str(r_dup_dnx[1] or '').strip(),
                    'stt_rec': str(r_dup_dnx[2] or '').strip(),
                    'ngay_ct': (r_dup_dnx[3].strftime('%Y-%m-%d') if isinstance(r_dup_dnx[3], (datetime, date)) else str(r_dup_dnx[3] or '')).strip(),
                    'dien_giai': str(r_dup_dnx[4] or '').strip(),
                    'ten_kh': str(r_dup_dnx[5] or '').strip(),
                    'ma_kho_xuat': str(r_dup_dnx[6] or '').strip(),
                    'ma_kho_nhan': str(r_dup_dnx[7] or '').strip(),
                    'so_may': str(r_dup_dnx[8] or '').strip() if len(r_dup_dnx) > 8 else '',
                    'ma_kx': str(r_dup_dnx[9] or '').strip() if len(r_dup_dnx) > 9 else '',
                    'ma_mau': str(r_dup_dnx[10] or '').strip() if len(r_dup_dnx) > 10 else ''
                }
                conn.close()
                return {
                    "success": False,
                    "already_exists": True,
                    "ticket_type": "DNX",
                    "error": f"Xe có số VIN {rd.get('so_khung')} đã được lập Phiếu Đề Nghị Xuất Xe số {rd.get('so_ct')} (ngày {rd.get('ngay_ct')}). Hệ thống chặn tạo phiếu trùng lặp!",
                    "existing_ticket": {
                        "ticket_type": "DNX",
                        "so_ct": rd.get('so_ct'),
                        "stt_rec": rd.get('stt_rec'),
                        "ngay_ct": rd.get('ngay_ct'),
                        "vin": rd.get('so_khung'),
                        "dien_giai": rd.get('dien_giai'),
                        "ten_kh": rd.get('ten_kh'),
                        "ma_kho_xuat": rd.get('ma_kho_xuat'),
                        "ma_kho_nhan": rd.get('ma_kho_nhan'),
                        "so_may": rd.get('so_may'),
                        "ma_kx": rd.get('ma_kx'),
                        "ma_mau": rd.get('ma_mau')
                    }
                }

            # Kiểm tra phiếu TD4 đã tồn tại
            sql_check_td4 = f"""
                SELECT TOP 1
                    COALESCE(NULLIF(RTRIM(p.Ma_Xe), ''), bx.So_khung, '') AS so_khung,
                    p.so_ct,
                    p.stt_rec,
                    p.ngay_ct,
                    p.dien_giai,
                    p.ong_ba AS ten_kh,
                    p.Ma_Hd_H AS so_hd,
                    p.so_may,
                    p.loai_xe
                FROM PHTD p WITH (NOLOCK)
                LEFT JOIN BEXEPXE bx WITH (NOLOCK) ON RTRIM(p.Ma_Hd_H) = RTRIM(bx.Ma_Hd)
                WHERE p.Ma_Ct = 'TD4'
                  AND (
                    RTRIM(p.Ma_Xe) IN ({vin_list_str})
                    OR bx.So_khung IN ({vin_list_str})
                  )
                ORDER BY p.ngay_ct DESC, p.so_ct DESC
            """
            cursor.execute(sql_check_td4)
            r_dup_td4 = cursor.fetchone()
            if r_dup_td4:
                rd_td4 = {str(k).lower(): (v.strftime('%Y-%m-%d') if isinstance(v, (datetime, date)) else str(v or '').strip()) for k, v in r_dup_td4.items()} if is_pymssql else {
                    'so_khung': str(r_dup_td4[0] or '').strip(),
                    'so_ct': str(r_dup_td4[1] or '').strip(),
                    'stt_rec': str(r_dup_td4[2] or '').strip(),
                    'ngay_ct': (r_dup_td4[3].strftime('%Y-%m-%d') if isinstance(r_dup_td4[3], (datetime, date)) else str(r_dup_td4[3] or '')).strip(),
                    'dien_giai': str(r_dup_td4[4] or '').strip(),
                    'ten_kh': str(r_dup_td4[5] or '').strip(),
                    'so_hd': str(r_dup_td4[6] or '').strip(),
                    'so_may': str(r_dup_td4[7] or '').strip() if len(r_dup_td4) > 7 else '',
                    'loai_xe': str(r_dup_td4[8] or '').strip() if len(r_dup_td4) > 8 else ''
                }
                conn.close()
                return {
                    "success": False,
                    "already_exists": True,
                    "ticket_type": "TD4",
                    "error": f"Xe có số VIN {rd_td4.get('so_khung')} đã được lập Phiếu Hẹn Giao Xe / Giấy Ra Cổng số {rd_td4.get('so_ct')} (ngày {rd_td4.get('ngay_ct')}). Không thể tạo thêm phiếu đề nghị xuất xe!",
                    "existing_ticket": {
                        "ticket_type": "TD4",
                        "so_ct": rd_td4.get('so_ct'),
                        "stt_rec": rd_td4.get('stt_rec'),
                        "ngay_ct": rd_td4.get('ngay_ct'),
                        "vin": rd_td4.get('so_khung'),
                        "dien_giai": rd_td4.get('dien_giai'),
                        "ten_kh": rd_td4.get('ten_kh'),
                        "so_hd": rd_td4.get('so_hd'),
                        "so_may": rd_td4.get('so_may'),
                        "loai_xe": rd_td4.get('loai_xe')
                    }
                }

        # 1. Tra cứu user_id từ UserInfo
        user_id = 289
        try:
            cursor.execute(f"SELECT user_id FROM UserInfo WHERE user_name = {ph}", (user_name,))
            r = cursor.fetchone()
            if r:
                raw_uid = r.get('user_id') if is_pymssql else r[0]
                if raw_uid is not None:
                    user_id = int(raw_uid)
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
            if max_so and str(max_so).startswith(prefix):
                try:
                    num = int(str(max_so).split('.')[-1]) + 1
                    so_ct = f"{prefix}{num:04d}"
                except Exception:
                    so_ct = f"{prefix}0001"
            else:
                so_ct = f"{prefix}0001"

        # 3. Sinh stt_rec duy nhất: A + 9 số + DNX (13 ký tự chuẩn CyberSoft)
        cursor.execute("SELECT stt_rec FROM PHDNX WHERE stt_rec LIKE 'A%DNX' AND LEN(stt_rec) = 13 ORDER BY stt_rec DESC")
        r_stt = cursor.fetchone()
        max_stt = (r_stt.get('stt_rec') if is_pymssql else r_stt[0]) if r_stt else None
        if max_stt and len(str(max_stt)) == 13:
            try:
                num = int(str(max_stt)[1:10]) + 1
                stt_rec = f"A{num:09d}DNX"
            except Exception:
                stt_rec = f"A{int(datetime.now().timestamp()):09d}"[:10] + "DNX"
        else:
            stt_rec = "A0000000251DNX"

        # 4. Tra cứu thông tin từng xe trong CT70BEX / DMKX để chèn vào CTDNX
        cars_detail = []
        total_qty = 0
        for idx, vin in enumerate(vins, start=1):
            vin_clean = vin.strip().upper()
            cursor.execute(f"""
                SELECT TOP 1 c.Ma_Kx, c.Ma_Mau, c.So_May, c.Ma_Kho, c.Ma_mau_nt,
                       ISNULL(k.Ten_Kx, c.Ma_Kx) AS Ten_Kx,
                       ISNULL(m.Ten_mau, c.Ma_Mau) AS Ten_mau
                FROM CT70BEX c
                LEFT JOIN Dmkx k ON c.Ma_Kx = k.Ma_Kx
                LEFT JOIN Dmmauxe m ON c.Ma_Mau = m.Ma_mau
                WHERE c.So_Khung = {ph}
                ORDER BY c.Ngay_Ct DESC
            """, (vin_clean,))
            car_info = cursor.fetchone() or {}

            if is_pymssql:
                ma_kx = (car_info.get('Ma_Kx') or '').strip()
                ten_kx = (car_info.get('Ten_Kx') or '').strip()
                ma_mau = (car_info.get('Ma_Mau') or '').strip()
                ten_mau = (car_info.get('Ten_mau') or '').strip()
                so_may = (car_info.get('So_May') or '').strip()
                ma_mau_nt = (car_info.get('Ma_mau_nt') or '').strip()
            else:
                ma_kx = (car_info[0] if len(car_info) > 0 else '') or ''
                ma_mau = (car_info[1] if len(car_info) > 1 else '') or ''
                so_may = (car_info[2] if len(car_info) > 2 else '') or ''
                ma_mau_nt = (car_info[4] if len(car_info) > 4 else '') or ''
                ten_kx = (car_info[5] if len(car_info) > 5 else '') or ''
                ten_mau = (car_info[6] if len(car_info) > 6 else '') or ''

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
                "ten_kx": ten_kx,
                "ma_mau": ma_mau,
                "ten_mau": ten_mau,
                "ma_kho_xuat": ma_kho_xuat,
                "ma_kho_nhan": ma_kho_nhan
            })

        # 5. Insert Header PHDNX (Ma_Post = '3' -> Mức xử lý: Lập phiếu (Sale admin))
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
            {ph}, {ph}, 'DNX', '4', '3',
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

        # 6. Post DNX Ticket to Inventory Ledger
        try:
            cursor.execute(f"EXEC CP_POSTCTDNX 'M', 'DNX', {ph}", (stt_rec,))
        except Exception as e_post:
            print(f"[Create DNX warning] CP_POSTCTDNX: {e_post}", file=sys.stderr)

        if not is_pymssql:
            conn.commit()
        conn.close()

        return {
            "success": True,
            "message": f"Đã lập thành công Phiếu Đề Nghị Xuất Xe {so_ct} trên CyberSoft ERP",
            "so_ct": str(so_ct),
            "stt_rec": str(stt_rec),
            "user_name": str(user_name),
            "user_id": int(user_id),
            "total_cars": int(total_qty),
            "cars": cars_detail
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": f"Lỗi tạo phiếu đề nghị xuất trên CyberSoft: {str(e)}"
        }

def lookup_vin_warehouse(params: dict = {}) -> dict:
    vin_input = params.get("vin") or ""
    vins = params.get("vins") or []
    if not vins and vin_input:
        tokens = re.findall(r'[A-Za-z0-9]{10,20}', str(vin_input).upper())
        vins = tokens if tokens else [str(vin_input).strip().upper()]

    vins_clean = [v.strip().upper() for v in vins if v and len(v.strip()) >= 8]

    try:
        is_pymssql = True
        try:
            import pymssql
            conn = pymssql.connect(
                server='SQLVanDao.Cybersoft.com.vn',
                port=7521,
                user='cyber_vandao',
                password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
                database='CyberAppGolden_VanDao',
                timeout=15,
                appname='CyberAppGolden',
            )
        except Exception:
            import pyodbc
            conn = pyodbc.connect(CYBER_CONN, timeout=15)
            is_pymssql = False

        c = conn.cursor(as_dict=True) if is_pymssql else conn.cursor()

        # 1. Luôn truy vấn danh mục kho xe thực tế từ Dmkho trên Cyber
        cyber_warehouses = []
        try:
            sql_wh = """
                SELECT RTRIM(LTRIM(ma_kho)) as ma_kho, RTRIM(LTRIM(ten_kho)) as ten_kho
                FROM Dmkho WITH (NOLOCK)
                WHERE (Ten_kho LIKE N'%xe%' OR Ten_kho LIKE N'%ô tô%' OR Ten_kho LIKE N'%Vinfast%' OR Ma_Kho IN ('K83','K85','K86','K87','KHCM.PVD','K103','K106','K58','K65','K66','K36'))
                  AND Ten_kho NOT LIKE N'%phụ tùng%'
                  AND Ten_kho NOT LIKE N'%vật tư%'
                  AND Ten_kho NOT LIKE N'%sạc%'
                  AND Ten_kho NOT LIKE N'%voucher%'
                  AND Ten_kho NOT LIKE N'%công cụ%'
                  AND Ten_kho NOT LIKE N'%thùng%'
                  AND Ten_kho NOT LIKE N'%xe máy%'
                  AND Ten_kho NOT LIKE N'%lazang%'
                  AND Ten_kho NOT LIKE N'%cơ khí%'
                ORDER BY 
                  CASE 
                    WHEN ma_kho = 'K83' THEN 1
                    WHEN ma_kho = 'K87' THEN 2
                    WHEN ma_kho = 'K86' THEN 3
                    WHEN ma_kho = 'K85' THEN 4
                    WHEN ma_kho = 'KHCM.PVD' THEN 5
                    WHEN ma_kho = 'K106' THEN 6
                    ELSE 10 
                  END, ma_kho
            """
            c.execute(sql_wh)
            wh_rows = c.fetchall()
            for r in wh_rows:
                mk = (r.get('ma_kho') if is_pymssql else r[0] or '').strip()
                tk = (r.get('ten_kho') if is_pymssql else r[1] or '').strip()
                if mk:
                    cyber_warehouses.append({"ma_kho": mk, "ten_kho": tk, "label": f"{mk} - {tk}"})
        except Exception as e_wh:
            print(f"[Warehouse lookup warning] {e_wh}", file=sys.stderr)

        if not vins_clean:
            conn.close()
            return {
                "success": True,
                "found": False,
                "ma_kho": "",
                "ten_kho": "",
                "total_vins": 0,
                "found_count": 0,
                "cars": [],
                "warehouses": cyber_warehouses
            }

        vin_list_str = ','.join([repr(v) for v in vins_clean])

        # 2. Tra cứu kho tồn thực tế từ CT70BEX
        sql_stock = f"""
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
        c.execute(sql_stock)
        stock_rows = c.fetchall()
        stock_map = {}
        for r in stock_rows:
            v = (r.get('So_Khung') if is_pymssql else r[0] or "").strip().upper()
            mk = (r.get('ma_kho') if is_pymssql else r[1] or "").strip()
            tk = (r.get('Ten_kho') if is_pymssql else r[2] or "").strip()
            stock_map[v] = {"ma_kho": mk, "ten_kho": tk}

        # 3. Tra cứu chi tiết xe từ CT70BEX & CTKH kết hợp danh mục DmKx & Dmmauxe (đầy đủ tên tiếng Việt)
        sql_info = f"""
            WITH BexInfo AS (
                SELECT 
                    b.So_Khung, b.So_May, b.Ma_Kx, b.Ma_Mau, b.Ma_Kho,
                    ROW_NUMBER() OVER(PARTITION BY b.So_Khung ORDER BY b.Ngay_Ct DESC, b.stt_rec DESC) AS rn
                FROM CT70BEX b WITH (NOLOCK)
                WHERE b.So_Khung IN ({vin_list_str})
            )
            SELECT 
                COALESCE(b.So_Khung, k.So_khung) AS so_khung,
                COALESCE(NULLIF(b.So_May, ''), k.So_May, '') AS so_may,
                COALESCE(NULLIF(b.Ma_Kx, ''), k.Ma_Kx, '') AS ma_kx,
                COALESCE(NULLIF(kx.Ten_Kx, ''), NULLIF(kx2.Ten_Kx, ''), NULLIF(b.Ma_Kx, ''), k.Ma_Kx, '') AS ten_kx,
                COALESCE(NULLIF(b.Ma_Mau, ''), k.Ma_Mau, '') AS ma_mau,
                COALESCE(NULLIF(mx.Ten_mau, ''), NULLIF(mx2.Ten_mau, ''), NULLIF(b.Ma_Mau, ''), k.Ma_Mau, '') AS ten_mau,
                COALESCE(b.Ma_Kho, kho.Ma_kho, '') AS ctkh_ma_kho,
                COALESCE(kho_b.Ten_kho, kho.Ten_kho, '') AS ctkh_ten_kho
            FROM BexInfo b
            FULL OUTER JOIN CTKH k WITH (NOLOCK) ON b.So_Khung = k.So_khung
            LEFT JOIN DmKx kx WITH (NOLOCK) ON b.Ma_Kx = kx.ma_kx
            LEFT JOIN DmKx kx2 WITH (NOLOCK) ON k.Ma_Kx = kx2.ma_kx
            LEFT JOIN Dmmauxe mx WITH (NOLOCK) ON b.Ma_Mau = mx.ma_Mau
            LEFT JOIN Dmmauxe mx2 WITH (NOLOCK) ON k.Ma_Mau = mx2.ma_Mau
            LEFT JOIN Dmkho kho_b WITH (NOLOCK) ON b.Ma_Kho = kho_b.Ma_kho
            LEFT JOIN Dmkho kho WITH (NOLOCK) ON k.Ma_Vitri = kho.Ma_kho
            WHERE b.rn = 1 OR b.rn IS NULL
        """
        c.execute(sql_info)
        info_rows = c.fetchall()

        # 4. Tra cứu phiếu Đề nghị xuất xe / Điều chuyển xe (DNX) của Showroom Thuận An đã lập trên CyberSoft
        sql_dnx = f"""
            SELECT 
                c.so_khung,
                p.so_ct,
                p.stt_rec,
                p.ngay_ct,
                p.dien_giai,
                p.ong_ba AS ten_kh,
                p.Ma_Hs_H AS nvkd,
                ISNULL(c.ma_kho_i, p.Ma_kho) AS ma_kho_xuat,
                kxuat.Ten_kho AS ten_kho_xuat,
                ISNULL(c.ma_khoN_i, p.Ma_khoN) AS ma_kho_nhan,
                knhan.Ten_kho AS ten_kho_nhan,
                c.so_may,
                c.ma_Kx,
                kx.Ten_Kx AS ten_kx,
                c.Ma_Mau,
                mx.Ten_mau AS ten_mau,
                ISNULL(c.Dien_giai_i, p.dien_giai) AS ghi_chu
            FROM CTDNX c WITH (NOLOCK)
            JOIN PHDNX p WITH (NOLOCK) ON c.stt_rec = p.stt_rec
            LEFT JOIN DmKx kx WITH (NOLOCK) ON c.ma_Kx = kx.ma_kx
            LEFT JOIN Dmmauxe mx WITH (NOLOCK) ON c.Ma_Mau = mx.ma_Mau
            LEFT JOIN Dmkho kxuat WITH (NOLOCK) ON ISNULL(c.ma_kho_i, p.Ma_kho) = kxuat.Ma_kho
            LEFT JOIN Dmkho knhan WITH (NOLOCK) ON ISNULL(c.ma_khoN_i, p.Ma_khoN) = knhan.Ma_kho
            WHERE c.so_khung IN ({vin_list_str})
              AND (
                p.Ma_TTCP_H = '02.01.08'
                OR p.so_ct LIKE '08.DNX%'
                OR ISNULL(c.ma_khoN_i, p.Ma_khoN) = 'K83'
              )
            ORDER BY p.ngay_ct DESC, p.so_ct DESC
        """
        c.execute(sql_dnx)
        dnx_rows = c.fetchall()
        if is_pymssql:
            dnx_raw_list = [r for r in dnx_rows]
        else:
            cols_dnx = [comp[0].lower() for comp in c.description]
            dnx_raw_list = [dict(zip(cols_dnx, r)) for r in dnx_rows]

        # 5. Tra cứu phiếu Phiếu Xe Ra / Giấy ra cổng giao xe (TD4) đã lập trên CyberSoft
        sql_td4 = f"""
            SELECT 
                COALESCE(NULLIF(RTRIM(p.Ma_Xe), ''), bx.So_khung, '') AS so_khung,
                p.so_ct,
                p.stt_rec,
                p.ngay_ct,
                p.ma_post,
                p.dien_giai,
                p.ong_ba AS ten_kh,
                p.Ma_Hd_H AS so_hd,
                p.so_may,
                p.loai_xe
            FROM PHTD p WITH (NOLOCK)
            LEFT JOIN BEXEPXE bx WITH (NOLOCK) ON RTRIM(p.Ma_Hd_H) = RTRIM(bx.Ma_Hd)
            WHERE p.Ma_Ct = 'TD4'
              AND (
                RTRIM(p.Ma_Xe) IN ({vin_list_str})
                OR bx.So_khung IN ({vin_list_str})
              )
            ORDER BY p.ngay_ct DESC, p.so_ct DESC
        """
        c.execute(sql_td4)
        td4_rows = c.fetchall()
        if is_pymssql:
            td4_raw_list = [r for r in td4_rows]
        else:
            cols_td4 = [comp[0].lower() for comp in c.description]
            td4_raw_list = [dict(zip(cols_td4, r)) for r in td4_rows]

        conn.close()

        td4_map = {}
        for r in td4_raw_list:
            rd = {str(k).lower(): (v.strftime('%Y-%m-%d') if isinstance(v, (datetime, date)) else str(v or '').strip()) for k, v in r.items()}
            v = rd.get('so_khung', '').upper()
            if v and v not in td4_map:
                td4_map[v] = {
                    "so_ct": rd.get('so_ct', ''),
                    "stt_rec": rd.get('stt_rec', ''),
                    "ngay_ct": rd.get('ngay_ct', ''),
                    "ma_post": rd.get('ma_post', ''),
                    "dien_giai": rd.get('dien_giai', ''),
                    "ten_kh": rd.get('ten_kh', ''),
                    "so_hd": rd.get('so_hd', ''),
                    "so_may": rd.get('so_may', ''),
                    "loai_xe": rd.get('loai_xe', '')
                }

        dnx_map = {}
        for r in dnx_raw_list:
            rd = {str(k).lower(): (v.strftime('%Y-%m-%d') if isinstance(v, (datetime, date)) else str(v or '').strip()) for k, v in r.items()}
            v = rd.get('so_khung', '').upper()
            if v and v not in dnx_map:
                dnx_map[v] = {
                    "so_ct": rd.get('so_ct', ''),
                    "stt_rec": rd.get('stt_rec', ''),
                    "ngay_ct": rd.get('ngay_ct', ''),
                    "dien_giai": rd.get('dien_giai', ''),
                    "ten_kh": rd.get('ten_kh', ''),
                    "nvkd": rd.get('nvkd', ''),
                    "ma_kho_xuat": rd.get('ma_kho_xuat', 'K87'),
                    "ten_kho_xuat": rd.get('ten_kho_xuat', ''),
                    "ma_kho_nhan": rd.get('ma_kho_nhan', 'K83'),
                    "ten_kho_nhan": rd.get('ten_kho_nhan', ''),
                    "so_may": rd.get('so_may', ''),
                    "ma_kx": rd.get('ma_kx', ''),
                    "ten_kx": rd.get('ten_kx', ''),
                    "ma_mau": rd.get('ma_mau', ''),
                    "ten_mau": rd.get('ten_mau', ''),
                    "ghi_chu": rd.get('ghi_chu', '')
                }

        info_map = {}
        for r in info_rows:
            rd = {str(k).lower(): str(v or '').strip() for k, v in r.items()} if isinstance(r, dict) else {}
            v = rd.get('so_khung', '').upper()
            sm = rd.get('so_may', '')
            mkx = rd.get('ma_kx', '')
            tkx = rd.get('ten_kx', '')
            mm = rd.get('ma_mau', '')
            tm = rd.get('ten_mau', '')
            ck_mk = rd.get('ctkh_ma_kho', '')
            ck_tk = rd.get('ctkh_ten_kho', '')
            info_map[v] = {
                "so_may": sm,
                "ma_kx": mkx,
                "ten_kx": tkx,
                "ma_mau": mm,
                "ten_mau": tm,
                "ctkh_ma_kho": ck_mk,
                "ctkh_ten_kho": ck_tk
            }

        results = []
        found_warehouses = []
        for v in vins_clean:
            st = stock_map.get(v, {})
            inf = info_map.get(v, {})
            dnx_entry = dnx_map.get(v)
            td4_entry = td4_map.get(v)
            ma_kho = (dnx_entry.get("ma_kho_xuat") if dnx_entry else "") or st.get("ma_kho") or inf.get("ctkh_ma_kho") or ""
            ten_kho = (dnx_entry.get("ten_kho_xuat") if dnx_entry else "") or st.get("ten_kho") or inf.get("ctkh_ten_kho") or ""
            if ma_kho:
                found_warehouses.append({"ma_kho": ma_kho, "ten_kho": ten_kho})
            results.append({
                "vin": v,
                "ma_kho": ma_kho,
                "ten_kho": ten_kho,
                "so_may": (dnx_entry.get("so_may") if dnx_entry else "") or inf.get("so_may", ""),
                "ma_kx": (dnx_entry.get("ma_kx") if dnx_entry else "") or inf.get("ma_kx", ""),
                "ten_kx": (dnx_entry.get("ten_kx") if dnx_entry else "") or inf.get("ten_kx", ""),
                "ma_mau": (dnx_entry.get("ma_mau") if dnx_entry else "") or inf.get("ma_mau", ""),
                "ten_mau": (dnx_entry.get("ten_mau") if dnx_entry else "") or inf.get("ten_mau", ""),
                "has_dnx": bool(dnx_entry),
                "dnx": dnx_entry,
                "has_td4": bool(td4_entry),
                "td4": td4_entry
            })

        first_mk = found_warehouses[0]["ma_kho"] if found_warehouses else ""
        first_tk = found_warehouses[0]["ten_kho"] if found_warehouses else ""
        first_dnx = results[0].get("dnx") if results else None
        first_td4 = results[0].get("td4") if results else None

        # Tự động cập nhật / lưu cache ngay vào bảng cyber_car_status trên Supabase
        try:
            upsert_cyber_car_status_records(results)
        except Exception as e_cache:
            print(f"[cyber_car_status cache warning] {e_cache}", file=sys.stderr)

        return {
            "success": True,
            "found": bool(first_mk),
            "ma_kho": first_mk,
            "ten_kho": first_tk,
            "total_vins": len(vins_clean),
            "found_count": len(found_warehouses),
            "has_dnx": bool(first_dnx),
            "dnx": first_dnx,
            "has_td4": bool(first_td4),
            "td4": first_td4,
            "cars": results,
            "warehouses": cyber_warehouses
        }
    except Exception as e:
        return {
            "success": False,
            "found": False,
            "error": f"Lỗi tra cứu kho Cyber: {str(e)}"
        }

def upsert_cyber_car_status_records(cars: list) -> int:
    """Lưu kết quả tổng hợp trạng thái xe từ Cyber vào bảng cyber_car_status trên Supabase."""
    if not cars:
        return 0
    records = []
    now_utc = datetime.now(timezone.utc).isoformat()
    for c in cars:
        v = (c.get("vin") or "").strip().upper()
        if not v:
            continue
        dnx = c.get("dnx") or {}
        td4 = c.get("td4") or {}
        records.append({
            "vin": v,
            "ma_kho": c.get("ma_kho", ""),
            "ten_kho": c.get("ten_kho", ""),
            "so_may": c.get("so_may", ""),
            "ma_kx": c.get("ma_kx", ""),
            "ten_kx": c.get("ten_kx", ""),
            "ma_mau": c.get("ma_mau", ""),
            "ten_mau": c.get("ten_mau", ""),
            "has_dnx": bool(c.get("has_dnx")),
            "so_ct_dnx": dnx.get("so_ct", "") if c.get("has_dnx") else "",
            "ngay_ct_dnx": dnx.get("ngay_ct") or None if c.get("has_dnx") else None,
            "dnx_data": dnx if c.get("has_dnx") else None,
            "has_td4": bool(c.get("has_td4")),
            "so_ct_td4": td4.get("so_ct", "") if c.get("has_td4") else "",
            "ngay_ct_td4": td4.get("ngay_ct") or None if c.get("has_td4") else None,
            "td4_data": td4 if c.get("has_td4") else None,
            "updated_at": now_utc
        })
    if not records:
        return 0
    updated_count = 0
    CHUNK_SIZE = 50
    for i in range(0, len(records), CHUNK_SIZE):
        chunk = records[i:i + CHUNK_SIZE]
        try:
            up_res = requests.post(
                f"{SUPABASE_URL}/rest/v1/cyber_car_status",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
                params={"on_conflict": "vin"},
                json=chunk,
                timeout=15
            )
            if 200 <= up_res.status_code < 300:
                updated_count += len(chunk)
            else:
                print(f"[Supabase cyber_car_status error] HTTP {up_res.status_code}: {up_res.text}", file=sys.stderr)
        except Exception as err:
            print(f"[Supabase cyber_car_status error] {err}", file=sys.stderr)
    return updated_count

def sync_cyber_car_status_to_supabase(target_vins: list = None) -> dict:
    """
    Quét danh sách các xe đang quản lý từ Supabase và nạp trạng thái mới nhất từ CyberSoft
    vào bảng cyber_car_status (được gọi định kỳ 5 phút/lần từ Render daemon).
    """
    vins_to_sync = target_vins or []
    if not vins_to_sync:
        try:
            dh_res = requests.get(
                f"{SUPABASE_URL}/rest/v1/donhang",
                headers=HEADERS,
                params={"select": "vin", "vin": "not.is.null", "limit": "300"},
                timeout=15
            )
            dh_vins = [r['vin'].strip().upper() for r in dh_res.json() if r.get('vin') and len(r['vin'].strip()) >= 8] if dh_res.ok else []

            kx_res = requests.get(
                f"{SUPABASE_URL}/rest/v1/khoxe",
                headers=HEADERS,
                params={"select": "vin", "vin": "not.is.null", "limit": "300"},
                timeout=15
            )
            kx_vins = [r['vin'].strip().upper() for r in kx_res.json() if r.get('vin') and len(r['vin'].strip()) >= 8] if kx_res.ok else []

            vins_to_sync = sorted(list(set(dh_vins + kx_vins)))
        except Exception as e:
            print(f"[sync_cyber_car_status_to_supabase] Lỗi lấy danh sách VIN từ Supabase: {e}", file=sys.stderr)

    if not vins_to_sync:
        return {"success": True, "total": 0, "updated": 0, "message": "Không có xe nào cần đồng bộ"}

    lookup_res = lookup_vin_warehouse({"vins": vins_to_sync})
    cars = lookup_res.get("cars") or []
    updated = upsert_cyber_car_status_records(cars)
    now_utc = datetime.now(timezone.utc).isoformat()
    return {
        "success": True,
        "total": len(cars),
        "updated": updated,
        "timestamp": now_utc
    }

def check_cyber_contract_status(params: dict = {}) -> dict:
    """
    Tra cứu hợp đồng trên CyberSoft ERP theo:
    1. Tên khách hàng (Ten_kh) VÀ Tên tư vấn bán hàng (Ten_Hs via DmHs)
    2. Fallback theo số VIN (BEXEPXE.So_khung) hoặc số chứng từ / số đơn hàng (PHHDX.so_ct / So_donhang)
    
    Quy tắc duyệt:
    - Ma_Post >= '3': Đã duyệt (is_approved = True)
    - Ma_Post == '2': Chờ duyệt (is_approved = False)
    - Ma_Post == '1': Đã hủy (is_approved = False)
    - Không tìm thấy: is_approved = False
    """
    customer_name = (params.get("customer_name") or params.get("ten_kh") or "").strip()
    tvbh_name = (params.get("tvbh_name") or params.get("ten_tvbh") or "").strip()
    vin = (params.get("vin") or "").strip().upper()
    order_no = (params.get("order_no") or params.get("so_don_hang") or "").strip()
    ma_ttcp = (params.get("ma_ttcp") or "02.01.08").strip()

    if not customer_name and not vin and not order_no:
        return {
            "success": True,
            "found": False,
            "is_approved": False,
            "message": "Chưa có thông tin khách hàng hoặc tư vấn bán hàng để tra cứu hợp đồng"
        }

    conn = None
    is_pymssql = False
    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=20,
            appname='CyberAppGolden'
        )
        is_pymssql = True
    except Exception:
        try:
            import pyodbc
            conn = pyodbc.connect(CYBER_CONN, timeout=20)
            is_pymssql = False
        except Exception as e_odbc:
            return {
                "success": False,
                "found": False,
                "is_approved": False,
                "error": f"Lỗi kết nối cơ sở dữ liệu CyberSoft: {e_odbc}"
            }

    cursor = conn.cursor(as_dict=True) if is_pymssql else conn.cursor()
    ph = "%s" if is_pymssql else "?"

    try:
        matched_contract = None

        # 1. Tra cứu chính xác theo CẶP TÊN KHÁCH HÀNG & TÊN TƯ VẤN BÁN HÀNG (Ưu tiên số 1)
        if customer_name and tvbh_name:
            sql_cus_tvbh = f"""
                SELECT TOP 1 
                    p.stt_rec, p.so_ct, p.Ma_Post, p.ngay_ct, p.Ten_kh, p.ong_ba,
                    p.Ma_Hs_H, ISNULL(h.Ten_Hs, '') AS ten_tvbh,
                    ISNULL(d.Ten_Post, N'Chưa phân loại') AS ten_post
                FROM PHHDX p WITH (NOLOCK)
                LEFT JOIN DmHs h WITH (NOLOCK) ON p.Ma_Hs_H = h.Ma_Hs
                LEFT JOIN DmPost d WITH (NOLOCK) ON d.Ma_Ct = 'HDX' AND d.Ma_Post = p.Ma_Post
                WHERE p.Ten_kh COLLATE SQL_Latin1_General_CP1_CI_AI LIKE {ph}
                  AND h.Ten_Hs COLLATE SQL_Latin1_General_CP1_CI_AI LIKE {ph}
                ORDER BY p.ngay_ct DESC, p.so_ct DESC
            """
            cursor.execute(sql_cus_tvbh, (f"%{customer_name}%", f"%{tvbh_name}%"))
            r = cursor.fetchone()
            if r:
                matched_contract = r if is_pymssql else dict(zip([col[0] for col in cursor.description], r))
                matched_contract['match_by'] = 'customer_and_tvbh'

        # 2. Nếu chưa ra, thử tra cứu theo Tên khách hàng (tại Showroom Thuận An 02.01.08)
        if not matched_contract and customer_name:
            sql_cus = f"""
                SELECT TOP 1 
                    p.stt_rec, p.so_ct, p.Ma_Post, p.ngay_ct, p.Ten_kh, p.ong_ba,
                    p.Ma_Hs_H, ISNULL(h.Ten_Hs, '') AS ten_tvbh,
                    ISNULL(d.Ten_Post, N'Chưa phân loại') AS ten_post
                FROM PHHDX p WITH (NOLOCK)
                LEFT JOIN DmHs h WITH (NOLOCK) ON p.Ma_Hs_H = h.Ma_Hs
                LEFT JOIN DmPost d WITH (NOLOCK) ON d.Ma_Ct = 'HDX' AND d.Ma_Post = p.Ma_Post
                WHERE p.Ten_kh COLLATE SQL_Latin1_General_CP1_CI_AI LIKE {ph}
                  AND p.Ma_TTCP_H = {ph}
                ORDER BY p.ngay_ct DESC, p.so_ct DESC
            """
            cursor.execute(sql_cus, (f"%{customer_name}%", ma_ttcp))
            r = cursor.fetchone()
            if r:
                matched_contract = r if is_pymssql else dict(zip([col[0] for col in cursor.description], r))
                matched_contract['match_by'] = 'customer_name_showroom'

        # 3. Fallback: Nếu vẫn chưa ra, thử tra cứu theo VIN đã ghép (BEXEPXE)
        if not matched_contract and vin and len(vin) >= 8:
            sql_vin = f"""
                SELECT TOP 1 
                    p.stt_rec, p.so_ct, p.Ma_Post, p.ngay_ct, p.Ten_kh, p.ong_ba,
                    p.Ma_Hs_H, ISNULL(h.Ten_Hs, '') AS ten_tvbh,
                    ISNULL(d.Ten_Post, N'Chưa phân loại') AS ten_post,
                    b.So_khung
                FROM BEXEPXE b WITH (NOLOCK)
                JOIN PHHDX p WITH (NOLOCK) ON b.Ma_Hd = p.so_ct
                LEFT JOIN DmHs h WITH (NOLOCK) ON p.Ma_Hs_H = h.Ma_Hs
                LEFT JOIN DmPost d WITH (NOLOCK) ON d.Ma_Ct = 'HDX' AND d.Ma_Post = p.Ma_Post
                WHERE b.So_khung = {ph}
                ORDER BY p.ngay_ct DESC
            """
            cursor.execute(sql_vin, (vin,))
            r = cursor.fetchone()
            if r:
                matched_contract = r if is_pymssql else dict(zip([col[0] for col in cursor.description], r))
                matched_contract['match_by'] = 'vin_bexepxe'

        # 4. Fallback: Nếu vẫn chưa ra, thử tra cứu theo số hợp đồng / số đơn hàng (PHHDX.so_ct hoặc So_donhang)
        if not matched_contract and order_no:
            sql_ord = f"""
                SELECT TOP 1 
                    p.stt_rec, p.so_ct, p.Ma_Post, p.ngay_ct, p.Ten_kh, p.ong_ba,
                    p.Ma_Hs_H, ISNULL(h.Ten_Hs, '') AS ten_tvbh,
                    ISNULL(d.Ten_Post, N'Chưa phân loại') AS ten_post
                FROM PHHDX p WITH (NOLOCK)
                LEFT JOIN DmHs h WITH (NOLOCK) ON p.Ma_Hs_H = h.Ma_Hs
                LEFT JOIN DmPost d WITH (NOLOCK) ON d.Ma_Ct = 'HDX' AND d.Ma_Post = p.Ma_Post
                WHERE p.so_ct = {ph} OR p.So_donhang = {ph}
                ORDER BY p.ngay_ct DESC
            """
            cursor.execute(sql_ord, (order_no, order_no))
            r = cursor.fetchone()
            if r:
                matched_contract = r if is_pymssql else dict(zip([col[0] for col in cursor.description], r))
                matched_contract['match_by'] = 'order_number'

        conn.close()

        if not matched_contract:
            return {
                "success": True,
                "found": False,
                "is_approved": False,
                "message": f"Chưa tìm thấy hợp đồng trên CyberSoft cho khách hàng '{customer_name}' - TVBH '{tvbh_name}'"
            }

        ma_post = str(matched_contract.get('Ma_Post') or '').strip()
        so_ct = str(matched_contract.get('so_ct') or '').strip()
        ten_post = str(matched_contract.get('ten_post') or '').strip()
        ten_kh = str(matched_contract.get('Ten_kh') or '').strip()
        ten_tvbh = str(matched_contract.get('ten_tvbh') or '').strip()
        ngay_ct = matched_contract.get('ngay_ct')
        if ngay_ct and isinstance(ngay_ct, (datetime, date)):
            ngay_ct = ngay_ct.strftime('%Y-%m-%d')
        else:
            ngay_ct = str(ngay_ct or '')

        # Kiểm tra trạng thái duyệt: Ma_Post >= '3' là đã duyệt
        is_approved = False
        try:
            is_approved = int(ma_post) >= 3
        except Exception:
            is_approved = ma_post in ['3', '4', '5', '6', '7', '8', '9']

        return {
            "success": True,
            "found": True,
            "is_approved": is_approved,
            "ma_post": ma_post,
            "ten_post": ten_post,
            "so_ct": so_ct,
            "ten_kh": ten_kh,
            "ten_tvbh": ten_tvbh,
            "ngay_ct": ngay_ct,
            "match_by": matched_contract.get('match_by')
        }

    except Exception as e:
        if conn:
            conn.close()
        return {
            "success": False,
            "found": False,
            "is_approved": False,
            "error": f"Lỗi truy vấn hợp đồng CyberSoft: {e}"
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
    parser.add_argument("--lookup-vin", action="store_true", help="Lookup vehicle warehouse and details from Cyber")
    parser.add_argument("--voucher-tickets", action="store_true", help="Get voucher tickets (DNX / TD4) from Cyber")
    parser.add_argument("--export-pdf", action="store_true", help="Export official PDF from CyberSoft Stimulsoft engine")
    parser.add_argument("--check-contract-status", action="store_true", help="Check contract approval status on Cyber by customer and TVBH")
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
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.plan_filter_options:
        res = get_cyber_plan_filter_options(args.model)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.ton_kho_report:
        p = get_input_params()
        res = get_cyber_ton_kho_report(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.xep_xe_contracts:
        p = get_input_params()
        res = get_cyber_xep_xe_contracts(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.xep_xe_candidates:
        p = get_input_params()
        res = get_cyber_xep_xe_candidates(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.xep_xe_save:
        p = get_input_params()
        res = save_cyber_xep_xe(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.xep_xe_delete:
        p = get_input_params()
        res = delete_cyber_xep_xe(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.create_dnx:
        p = get_input_params()
        res = create_cyber_dnx_ticket(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.lookup_vin:
        p = get_input_params()
        res = lookup_vin_warehouse(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.voucher_tickets:
        p = get_input_params()
        tickets = get_cyber_voucher_tickets(
            ma_ct=p.get("ma_ct") or "",
            ma_post=p.get("ma_post") or "",
            search=p.get("search") or "",
            from_date=p.get("fromDate") or "",
            to_date=p.get("toDate") or "",
            limit=p.get("limit") or 200,
            ma_ttcp=p.get("ma_ttcp") or "02.01.08"
        )
        res = {"success": True, "data": tickets, "total": len(tickets)}
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.export_pdf:
        p = get_input_params()
        stt_rec = p.get("stt_rec") or "A000033691TD4"
        voucher_type = p.get("voucher_type") or "TD4"
        paper_size = p.get("paper_size") or "A4"
        user_name = p.get("user_name") or "02.NHANPT"
        inc_sig = p.get("include_signatures")
        if inc_sig is None:
            inc_sig_str = "true"
        elif isinstance(inc_sig, bool):
            inc_sig_str = "true" if inc_sig else "false"
        else:
            inc_sig_str = str(inc_sig)
        res = export_cyber_pdf_via_ps(stt_rec, voucher_type, paper_size, user_name, inc_sig_str)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.check_contract_status:
        p = get_input_params()
        res = check_cyber_contract_status(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    if args.search_plan:
        p = get_input_params()
        res = search_cyber_factory_plan(p)
        print(json.dumps(res, default=str, ensure_ascii=False))
        return

    p = {}
    if not (args.from_date and args.preview):
        p = get_input_params()
    today = date.today()
    from_date = (p.get("fromDate") if isinstance(p, dict) else None) or args.from_date or today.replace(day=1).strftime("%Y-%m-%d")
    to_date = (p.get("toDate") if isinstance(p, dict) else None) or args.to_date or today.strftime("%Y-%m-%d")
    is_preview = args.preview or (isinstance(p, dict) and p.get("preview", False))

    # Nếu người dùng đã chỉnh sửa danh sách xe ngay tại Modal và bấm nạp
    input_cars = p.get("cars") if isinstance(p, dict) and p.get("cars") else None
    if input_cars and not is_preview:
        ok, fail = upsert_to_supabase_khoxe(input_cars)
        output = {
            "success": fail == 0,
            "mode": "sync_custom",
            "from_date": from_date,
            "to_date": to_date,
            "total": len(input_cars),
            "success_count": ok,
            "fail_count": fail,
            "cars": input_cars[:10],
            "vins": [c.get("vin") for c in input_cars if c.get("vin")]
        }
        print(json.dumps(output, default=str, ensure_ascii=False))
        return

    raw_cars = fetch_allocations_from_cyber(from_date, to_date)
    raw_vins = [c.get("vin", "").strip().upper() for c in raw_cars if c.get("vin")]
    plan_map = fetch_plan_map(raw_vins)
    mapped_cars = [map_allocation_to_khoxe(c, plan_map) for c in raw_cars if c.get("vin")]

    if is_preview:
        output = {
            "success": True,
            "mode": "preview",
            "from_date": from_date,
            "to_date": to_date,
            "total": len(mapped_cars),
            "cars": mapped_cars
        }
        print(json.dumps(output, default=str, ensure_ascii=False))
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
    print(json.dumps(output, default=str, ensure_ascii=False))

def get_cyber_voucher_tickets(ma_ct=None, ma_post=None, search=None, from_date=None, to_date=None, limit=200, ma_ttcp="02.01.08"):
    """
    Truy vấn danh sách chứng từ Phiếu Đề Nghị Xuất Xe (DNX) và Phiếu Xe Ra (TD4) từ CyberSoft SQL Server
    để hiển thị tiến trình duyệt (Ma_Post) trên Web App (mặc định chỉ lấy dữ liệu của Thuận An 02.01.08).
    """
    conn = None
    is_pymssql = False

    try:
        import pymssql
        conn = pymssql.connect(
            server='SQLVanDao.Cybersoft.com.vn',
            port=7521,
            user='cyber_vandao',
            password='HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv',
            database='CyberAppGolden_VanDao',
            timeout=30,
            appname='CyberAppGolden',
        )
        is_pymssql = True
    except Exception as e_pymssql:
        try:
            import pyodbc
            conn = pyodbc.connect(CYBER_CONN, timeout=30)
            is_pymssql = False
        except Exception as e_pyodbc:
            raise Exception(f"Lỗi kết nối CyberSoft SQL Server: {e_pymssql}")

    cursor = conn.cursor(as_dict=True) if is_pymssql else conn.cursor()
    tickets = []

    limit_val = int(limit) if limit else 200

    # Build WHERE conditions (Default to Showroom Thuận An: 02.01.08)
    ttcp_filter = (ma_ttcp or '02.01.08').strip()
    where_dnx = [f"p.Ma_TTCP_H = '{ttcp_filter}'"]
    where_td4 = ["p.Ma_Ct = 'TD4'", f"p.Ma_TTCP_H = '{ttcp_filter}'"]

    if ma_post:
        where_dnx.append(f"p.Ma_Post = '{ma_post}'")
        where_td4.append(f"p.Ma_Post = '{ma_post}'")

    if from_date:
        where_dnx.append(f"p.ngay_ct >= '{from_date}'")
        where_td4.append(f"p.Ngay_Ct >= '{from_date}'")

    if to_date:
        where_dnx.append(f"p.ngay_ct <= '{to_date}'")
        where_td4.append(f"p.Ngay_Ct <= '{to_date}'")

    # 1. Fetch DNX tickets (PHDNX + CTDNX)
    if not ma_ct or str(ma_ct).upper() == 'DNX':
        where_clause = " WHERE " + " AND ".join(where_dnx) if where_dnx else ""
        query_dnx = f"""
            SELECT TOP {limit_val} 
                'DNX' AS voucher_type,
                N'Đề Nghị Xuất Xe' AS voucher_name,
                p.stt_rec,
                p.so_ct,
                p.ngay_ct,
                '' AS gio_ct,
                p.Ma_Post AS ma_post,
                p.Ma_TTCP_H AS ma_ttcp,
                p.dien_giai,
                p.ong_ba AS nguoi_nhan,
                p.ong_ba,
                ISNULL(NULLIF(hdx.Ten_kh, ''), ISNULL(NULLIF(hdx2.Ten_kh, ''), '')) AS ten_kh,
                ISNULL(NULLIF(hs.Ten_Hs, ''), ISNULL(NULLIF(hs2.Ten_Hs, ''), '')) AS ten_tvbh,
                ISNULL(NULLIF(bx.Ma_Hd, ''), ISNULL(NULLIF(p.MA_HD_H, ''), '')) AS so_hd,
                ISNULL(p.t_tien, 0) AS tong_tien,
                0 AS da_thanh_toan,
                ISNULL(p.t_tien, 0) AS con_lai,
                ISNULL(NULLIF(hs.Ten_Hs, ''), ISNULL(NULLIF(hs2.Ten_Hs, ''), p.Ma_Hs_H)) AS nvkd,
                ISNULL(c.So_khung, '') AS vin,
                ISNULL(c.So_may, '') AS so_may,
                ISNULL(c.ma_Kx, '') AS loai_xe,
                ISNULL(kx.Ten_Kx, ISNULL(c.ma_Kx, '')) AS ten_kx,
                ISNULL(c.Ma_Mau, '') AS ma_mau,
                ISNULL(mx.Ten_mau, ISNULL(c.Ma_Mau, '')) AS ten_mau,
                ISNULL(c.Ma_kho_i, p.Ma_kho) AS ma_kho_xuat,
                ISNULL(p.Ma_khoN, 'K83') AS ma_kho_nhan
            FROM PHDNX p WITH (NOLOCK)
            LEFT JOIN CTDNX c WITH (NOLOCK) ON p.stt_rec = c.stt_rec
            LEFT JOIN Dmkx kx WITH (NOLOCK) ON c.ma_Kx = kx.Ma_Kx
            LEFT JOIN Dmmauxe mx WITH (NOLOCK) ON c.Ma_Mau = mx.Ma_mau
            LEFT JOIN BEXEPXE bx WITH (NOLOCK) ON c.So_khung = bx.So_khung
            LEFT JOIN PHHDX hdx WITH (NOLOCK) ON bx.Ma_Hd = hdx.so_ct
            LEFT JOIN DmHs hs WITH (NOLOCK) ON hdx.Ma_Hs_H = hs.Ma_Hs
            LEFT JOIN PHHDX hdx2 WITH (NOLOCK) ON p.MA_HD_H = hdx2.so_ct
            LEFT JOIN DmHs hs2 WITH (NOLOCK) ON hdx2.Ma_Hs_H = hs2.Ma_Hs
            {where_clause}
            ORDER BY p.ngay_ct DESC, p.so_ct DESC
        """
        cursor.execute(query_dnx)
        if is_pymssql:
            rows = cursor.fetchall()
            for d in rows:
                if d.get('ngay_ct'):
                    d['ngay_ct'] = d['ngay_ct'].strftime('%Y-%m-%d')
                tickets.append(d)
        else:
            cols = [comp[0] for comp in cursor.description]
            for r in cursor.fetchall():
                d = dict(zip(cols, r))
                d['ngay_ct'] = d['ngay_ct'].strftime('%Y-%m-%d') if d['ngay_ct'] else ''
                tickets.append(d)

    # 2. Fetch TD4 tickets (PHTD)
    if not ma_ct or str(ma_ct).upper() in ['TD4', 'PXR']:
        where_clause = " WHERE " + " AND ".join(where_td4) if where_td4 else ""
        query_td4 = f"""
            SELECT TOP {limit_val} 
                'TD4' AS voucher_type,
                N'Phiếu Xe Ra Giao KH' AS voucher_name,
                p.Stt_Rec AS stt_rec,
                p.So_Ct AS so_ct,
                p.Ngay_Ct AS ngay_ct,
                ISNULL(p.Gio_CT, '') AS gio_ct,
                p.Ma_Post AS ma_post,
                p.Ma_TTCP_H AS ma_ttcp,
                p.Dien_giai AS dien_giai,
                p.Ong_ba AS nguoi_nhan,
                p.Ong_ba,
                ISNULL(p.Ghi_chu, '') AS ghi_chu,
                ISNULL(hs_bl.Ten_Hs, '') AS nguoi_bao_lanh,
                ISNULL(bp.Ten_Bp, 'P. KINH DOANH') AS phong_ban,
                ISNULL(hdx.Ten_kh, '') AS ten_kh,
                ISNULL(hs.Ten_Hs, '') AS ten_tvbh,
                p.Ma_Hd_H AS so_hd,
                ISNULL(p.T_TT, 0) AS tong_tien,
                ISNULL(p.T_Da_TT, 0) AS da_thanh_toan,
                ISNULL(p.T_CL_TT, 0) AS con_lai,
                ISNULL(hs.Ten_Hs, p.Ma_Hs_H) AS nvkd,
                ISNULL(p.Ma_Xe, '') AS vin,
                ISNULL(p.So_may, '') AS so_may,
                ISNULL(p.Loai_xe, '') AS loai_xe,
                '' AS ma_mau
            FROM PHTD p WITH (NOLOCK)
            LEFT JOIN PHHDX hdx WITH (NOLOCK) ON p.Ma_Hd_H = hdx.so_ct
            LEFT JOIN DmHs hs WITH (NOLOCK) ON (hdx.Ma_Hs_H = hs.Ma_Hs OR p.Ma_Hs_H = hs.Ma_Hs)
            LEFT JOIN DmHs hs_bl WITH (NOLOCK) ON p.Ma_Hs_BL = hs_bl.Ma_Hs
            LEFT JOIN Dmbp bp WITH (NOLOCK) ON p.Ma_Bp_H = bp.Ma_Bp
            {where_clause}
            ORDER BY p.Ngay_Ct DESC, p.So_Ct DESC
        """
        cursor.execute(query_td4)
        if is_pymssql:
            rows = cursor.fetchall()
            for d in rows:
                if d.get('ngay_ct'):
                    d['ngay_ct'] = d['ngay_ct'].strftime('%Y-%m-%d')
                tickets.append(d)
        else:
            cols = [comp[0] for comp in cursor.description]
            for r in cursor.fetchall():
                d = dict(zip(cols, r))
                d['ngay_ct'] = d['ngay_ct'].strftime('%Y-%m-%d') if d['ngay_ct'] else ''
                tickets.append(d)

    conn.close()

    # Bổ sung Tên khách hàng & TVBH từ Supabase donhang cho các xe chưa có thông tin từ Cyber
    try:
        missing_vins = [t['vin'].strip() for t in tickets if t.get('vin') and not t.get('ten_kh')]
        if missing_vins:
            import urllib.request
            unique_vins = list(set(missing_vins))[:80]
            supa_url = f"https://jwvgxqrkjlbewvpkvucj.supabase.co/rest/v1/donhang?select=vin,ten_khach_hang,ten_tu_van_ban_hang,so_don_hang&vin=in.({','.join(unique_vins)})"
            headers = {
                'apikey': 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX',
                'Authorization': 'Bearer sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX'
            }
            req = urllib.request.Request(supa_url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as resp:
                supa_orders = json.loads(resp.read().decode('utf-8'))
                supa_map = {o['vin'].strip().upper(): o for o in supa_orders if o.get('vin')}
                for t in tickets:
                    vin_key = (t.get('vin') or '').strip().upper()
                    if vin_key in supa_map:
                        order_item = supa_map[vin_key]
                        if not t.get('ten_kh'):
                            t['ten_kh'] = order_item.get('ten_khach_hang') or ''
                        if not t.get('ten_tvbh'):
                            t['ten_tvbh'] = order_item.get('ten_tu_van_ban_hang') or ''
                        if not t.get('so_hd'):
                            t['so_hd'] = order_item.get('so_don_hang') or ''
    except Exception as e_supa:
        pass

    # SẮP XẾP TOÀN BỘ DANH SÁCH THEO THỜI GIAN TẠO GIẢM DẦN (KHÔNG PHÂN BIỆT LOẠI PHIẾU DNX / TD4)
    def get_ticket_sort_key(t):
        d = t.get('ngay_ct') or t.get('ngay_lct') or '1900-01-01'
        d_str = str(d)[:10]
        g = (t.get('gio_ct') or '').strip()
        if not g:
            g = '12:00'
        so_ct = str(t.get('so_ct') or '')
        stt = str(t.get('stt_rec') or '')
        return (d_str, g, so_ct, stt)

    tickets.sort(key=get_ticket_sort_key, reverse=True)

    # Apply search query in python if provided
    if search and search.strip():
        q = search.strip().lower()
        filtered = []
        for t in tickets:
            full_text = f"{t.get('so_ct','')} {t.get('vin','')} {t.get('so_may','')} {t.get('ten_kh','')} {t.get('ten_tvbh','')} {t.get('so_hd','')} {t.get('dien_giai','')}".lower()
            if q in full_text:
                filtered.append(t)
        return filtered

    return tickets

def export_cyber_pdf_via_ps(stt_rec, voucher_type="TD4", paper_size="A4", user_name="02.NHANPT", include_signatures="true"):
    import subprocess
    import os
    import re
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ps_path = os.path.join(script_dir, "render_cyber_pdf.ps1")
    
    sig_suffix = "_sig" if str(include_signatures).lower() in ["true", "1"] else "_nosig"
    clean_stt = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(stt_rec)) + sig_suffix
    project_dir = os.path.dirname(script_dir)
    out_dir = os.path.join(project_dir, "public", "cyber_pdfs")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"{clean_stt}.pdf")
    
    cmd = [
        "powershell",
        "-ExecutionPolicy", "Bypass",
        "-File", ps_path,
        "-SttRec", str(stt_rec),
        "-VoucherType", str(voucher_type),
        "-PaperSize", str(paper_size),
        "-UserName", str(user_name),
        "-IncludeSignatures", str(include_signatures),
        "-OutFile", out_file
    ]
    
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
        if os.path.exists(out_file) and os.path.getsize(out_file) > 1000:
            import base64
            with open(out_file, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            return {
                "success": True,
                "pdf_url": f"/api/cyber/view-pdf?stt_rec={clean_stt}",
                "pdf_base64": f"data:application/pdf;base64,{b64}",
                "file_path": out_file,
                "size": os.path.getsize(out_file),
                "stt_rec": stt_rec,
                "voucher_type": voucher_type
            }
        else:
            err_msg = proc.stderr or proc.stdout or "Không xuất được file PDF từ CyberSoft."
            return {"success": False, "error": err_msg}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    main()


