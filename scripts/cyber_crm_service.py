import os
import sys
import json
import re
from datetime import datetime
import pyodbc
from dotenv import load_dotenv

# Ensure project root is in sys.path and load environment variables
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BASE_DIR not in sys.path:
    sys.path.insert(0, _BASE_DIR)
_SCRIPTS_DIR = os.path.abspath(os.path.dirname(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

_env_path = os.path.join(_BASE_DIR, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

from scripts.sync_thuan_an_allocations import CYBER_CONN

def get_db_connection():
    return pyodbc.connect(CYBER_CONN, timeout=15)

import unicodedata

def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', str(input_str))
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)]).lower().replace('đ', 'd').replace('Đ', 'd').strip()

def clean_phone(raw):
    if not raw:
        return ""
    p = re.sub(r"[^\d]", "", str(raw).strip())
    if p.startswith("84") and len(p) == 11:
        p = "0" + p[2:]
    return p

def get_crm_metadata():
    """Lấy danh sách TVBH, dòng xe, nguồn tiếp cận, trạng thái khách từ Cyber."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. TVBH chi nhánh 02
        cursor.execute("""
            SELECT user_id, user_name, comment 
            FROM dbo.Userinfo 
            WHERE user_name LIKE '02.%' AND Acti = 1
            ORDER BY comment, user_name
        """)
        users = []
        for r in cursor.fetchall():
            uid, uname, comment = r
            users.append({
                "userId": int(uid) if uid is not None else 0,
                "userName": (uname or "").strip(),
                "fullName": (comment or uname or "").strip()
            })

        # 2. Dòng xe VinFast (DmKx)
        cursor.execute("""
            SELECT DISTINCT RTRIM(Ma_Kx) as Ma_Kx, RTRIM(Ten_Kx) as Ten_Kx 
            FROM dbo.DmKx 
            WHERE Ma_Kx LIKE 'VF%' OR Ten_Kx LIKE '%VF%' OR Ma_Kx = 'EB15' OR Ma_Kx LIKE 'HERIO%'
            ORDER BY Ma_Kx
        """)
        models = []
        for r in cursor.fetchall():
            models.append({
                "maKx": (r[0] or "").strip(),
                "tenKx": (r[1] or "").strip()
            })

        # 3. Nguồn khách (CRDMPTLH)
        cursor.execute("""
            SELECT RTRIM(Ma_PTLH), RTRIM(Ten_PTLH) 
            FROM dbo.CRDMPTLH 
            WHERE Acti = 1 
            ORDER BY Ma_PTLH
        """)
        sources = []
        for r in cursor.fetchall():
            sources.append({
                "maPtlh": (r[0] or "").strip(),
                "tenPtlh": (r[1] or "").strip()
            })

        # 4. Trạng thái khách (CRDmTTKH)
        cursor.execute("""
            SELECT RTRIM(Ma_TTKH), RTRIM(Ten_TTKH) 
            FROM dbo.CRDmTTKH 
            ORDER BY Ma_TTKH
        """)
        statuses = []
        for r in cursor.fetchall():
            statuses.append({
                "maTtkh": (r[0] or "").strip(),
                "tenTtkh": (r[1] or "").strip()
            })

        # 5. Điểm kinh doanh (DmTTCP)
        cursor.execute("""
            SELECT RTRIM(Ma_TTCP), RTRIM(Ten_TTCP)
            FROM dbo.DmTTCP
            WHERE Ma_TTCP LIKE '02%'
            ORDER BY Ma_TTCP
        """)
        locations = []
        for r in cursor.fetchall():
            locations.append({
                "maTtcp": (r[0] or "").strip(),
                "tenTtcp": (r[1] or "").strip()
            })

        # 6. Màu xe (DmMauXe)
        cursor.execute("""
            SELECT DISTINCT RTRIM(Ma_mau), RTRIM(Ten_mau) 
            FROM dbo.DmMauXe 
            WHERE Acti = 1 AND Ten_mau IS NOT NULL AND Ten_mau != ''
            ORDER BY RTRIM(Ten_mau)
        """)
        colors = []
        for r in cursor.fetchall():
            colors.append({
                "maMau": (r[0] or "").strip(),
                "tenMau": (r[1] or "").strip()
            })

        return {
            "success": True,
            "data": {
                "users": users,
                "models": models,
                "sources": sources,
                "statuses": statuses,
                "locations": locations,
                "colors": colors,
                "paymentMethods": [
                    {"maHttt": "01", "tenHttt": "Trả thẳng"},
                    {"maHttt": "02", "tenHttt": "Trả góp"}
                ]
            }
        }
    finally:
        conn.close()

def check_duplicates(phone_list):
    """Kiểm tra danh sách SĐT xem có ai đã nạp lên Cyber chưa."""
    if not phone_list:
        return {"success": True, "duplicates": {}}

    cleaned = {}
    for p in phone_list:
        cp = clean_phone(p)
        if len(cp) >= 9:
            cleaned[cp] = p

    if not cleaned:
        return {"success": True, "duplicates": {}}

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Tìm trong CRQLKHTN
        dups = {}
        target_phones = list(cleaned.keys())
        chunk_size = 50
        for i in range(0, len(target_phones), chunk_size):
            chunk = target_phones[i:i + chunk_size]
            placeholders = ",".join(["?"] * len(chunk))
            query = f"""
                SELECT RTRIM(DT1), RTRIM(Id_Kh), RTRIM(Ten_kh), RTRIM(User_Name), Ngay_tao 
                FROM dbo.CRQLKHTN 
                WHERE DT1 IN ({placeholders}) OR Dt2 IN ({placeholders})
            """
            params = chunk + chunk
            cursor.execute(query, params)
            for r in cursor.fetchall():
                p_db, id_kh, ten_kh, uname, ngay_tao = r
                p_clean = clean_phone(p_db)
                orig_p = cleaned.get(p_clean, p_clean)
                dups[orig_p] = {
                    "idKh": id_kh,
                    "customerName": ten_kh,
                    "userName": uname,
                    "createdAt": str(ngay_tao)[:10] if ngay_tao else ""
                }
                # Cũng đánh dấu theo số đã làm sạch
                dups[p_clean] = dups[orig_p]

        return {"success": True, "duplicates": dups}
    finally:
        conn.close()

def generate_id_kh(cursor, user_name, ma_dvcs="02"):
    """Gọi thủ tục CP_SysListGencodeCRQLKHTN để lấy mã Id_Kh tự động tuần tự."""
    cursor.execute("""
        DECLARE @Status NVARCHAR(1), @Msg NVARCHAR(1), @Note NVARCHAR(200), @Value NVARCHAR(400);
        EXEC dbo.CP_SysListGencodeCRQLKHTN 
            @M_strField = N'Id_Kh',
            @M_strValue = N'',
            @M_Mode = N'M',
            @M_Ma_Dvcs = ?,
            @M_User_Name = ?;
    """, (ma_dvcs, user_name))
    row = cursor.fetchone()
    if row and row[3]:
        return row[3].strip()
    return None

def import_bulk_khtn(user_name, leads, ma_dvcs="02", ma_ttcp="02.01.08"):
    """
    Nạp hàng loạt khách hàng tiềm năng vào Cyber CRQLKHTN.
    user_name: TVBH phụ trách (vd: '02.sonht')
    leads: mảng dict gồm thông tin khách
    ma_ttcp: Điểm kinh doanh (mặc định '02.01.08' - Ô tô Vinfast Thuận An)
    """
    user_name = (user_name or "").strip()
    if not user_name:
        return {"success": False, "message": "Vui lòng chọn TVBH phụ trách."}
    if not leads:
        return {"success": False, "message": "Danh sách khách hàng trống."}

    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now()

    # Build color lookup dictionary from Cyber DmMauXe
    cursor.execute("SELECT RTRIM(Ma_mau), RTRIM(Ten_mau) FROM dbo.DmMauXe WHERE Acti = 1")
    color_lookup = {}
    for r in cursor.fetchall():
        c_code = (r[0] or "").strip()
        c_name = (r[1] or "").strip()
        if c_code:
            color_lookup[c_code.upper()] = c_code
        if c_name:
            color_lookup[remove_accents(c_name)] = c_code

    created = []
    errors = []

    try:
        total_leads = len(leads)
        max_day = max(1, now.day)

        for idx, lead in enumerate(leads):
            c_name = (lead.get("fullName") or lead.get("customerName") or lead.get("tenKh") or lead.get("name") or "").strip()
            c_phone = clean_phone(lead.get("phone") or lead.get("dt1") or "")
            if not c_name:
                errors.append({"index": idx, "error": "Thiếu tên khách hàng"})
                continue
            if not c_phone or len(c_phone) < 9:
                errors.append({"index": idx, "name": c_name, "error": "Số điện thoại không hợp lệ"})
                continue

            # Ngày tạo & giờ tạo: nhận từ lead hoặc tự động phân bổ chia đều trong tháng
            lead_date = lead.get("createdDate") or lead.get("ngayTao") or lead.get("date")
            lead_time = lead.get("createdTime") or lead.get("gioTao") or lead.get("time")

            if lead_date:
                d_str = str(lead_date).strip()
                if "T" in d_str:
                    d_str = d_str.split("T")[0]
                elif " " in d_str:
                    d_str = d_str.split(" ")[0]
                
                parsed_dt = None
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                    try:
                        parsed_dt = datetime.strptime(d_str, fmt)
                        break
                    except ValueError:
                        pass
                
                if parsed_dt:
                    ngay_tao = parsed_dt.strftime("%Y-%m-%d 00:00:00")
                else:
                    ngay_tao = f"{d_str} 00:00:00"
            else:
                # Phân bổ ngày luân phiên từ ngày 1 đến ngày hôm nay của tháng
                if total_leads > 1:
                    day_num = max(1, min(max_day, int((idx / (total_leads - 1 or 1)) * (max_day - 1)) + 1))
                else:
                    import random
                    day_num = random.randint(1, max_day)
                dist_date = now.replace(day=day_num)
                ngay_tao = dist_date.strftime("%Y-%m-%d 00:00:00")

            if lead_time:
                gio_tao = str(lead_time).strip()[:5]
            else:
                hours = [8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19]
                mins = [5, 12, 18, 24, 30, 37, 42, 48, 55]
                h = hours[(idx * 3 + (idx % 2)) % len(hours)]
                m = mins[(idx * 7 + (idx % 3)) % len(mins)]
                gio_tao = f"{h:02d}:{m:02d}"

            # Sinh Id_Kh
            id_kh = generate_id_kh(cursor, user_name, ma_dvcs=ma_dvcs)
            if not id_kh:
                errors.append({"index": idx, "name": c_name, "error": "Không thể sinh mã ID từ Cyber"})
                continue

            dia_chi = (lead.get("address") or lead.get("diaChi") or "Thuận An").strip()
            ma_kx = (lead.get("model") or lead.get("maKx") or "").strip()
            ghi_chu = (lead.get("note") or lead.get("ghiChu") or "Nạp tự động từ OrderManagement").strip()

            # Thông minh nhận diện màu xe
            raw_color = (lead.get("color") or lead.get("maMau") or lead.get("colorCode") or "").strip()
            ma_mau = ""
            if raw_color:
                if raw_color.upper() in color_lookup:
                    ma_mau = color_lookup[raw_color.upper()]
                elif remove_accents(raw_color) in color_lookup:
                    ma_mau = color_lookup[remove_accents(raw_color)]
                else:
                    clean_rc = remove_accents(raw_color)
                    for k, code in color_lookup.items():
                        if len(k) > 2 and (k in clean_rc or clean_rc in k):
                            ma_mau = code
                            break
            if not ma_mau and ghi_chu:
                # Tìm trong ghi chú xem có nhắc đến màu gì không
                note_clean = remove_accents(ghi_chu)
                for k, code in color_lookup.items():
                    if len(k) > 3 and k in note_clean:
                        ma_mau = code
                        break

            ma_httt = (lead.get("paymentMethod") or lead.get("maHttt") or "01").strip()
            ma_ptlh = (lead.get("leadSource") or lead.get("maPtlh") or "04").strip() # Mặc định 04: Facebook / Online
            ma_ttkh = (lead.get("status") or lead.get("maTtkh") or "02").strip()     # Mặc định 02: Warm

            lead_ttcp = (lead.get("businessLocation") or lead.get("maTtcp") or lead.get("ma_ttcp") or ma_ttcp or "02.01.08").strip()

            sql_insert = """
                INSERT INTO dbo.CRQLKHTN (
                    Ma_Dvcs, Ngay_tao, Gio_Tao, Id_Kh, Ong_Ba,
                    Ngay_Sinh, NS_Xac_Dinh, Ngay_DKKH,
                    Ten_kh, Dia_Chi, Ten_khVAT, Dia_ChiVAT,
                    DT1, Dt2, Dt3, Dt4,
                    Chuc_Vu, MST_CN, Ma_So_DN, SCMT,
                    EMail1, EMail2, Thu_Nhap, Ma_So_THue,
                    Ng_QH, DC_QH, DT_QH,
                    nguoi_mg, dc_mg, dt_mg,
                    Ng_LT, So_bang_LT, Xe_LT,
                    Ghi_Chu, Dung,
                    Ma_LHKH, Ma_TTHN, Ma_GT, Ma_DTuoi, Ma_PTLH,
                    Ma_TP, Ma_Quan, Ma_Xa,
                    Ma_Kx, Ma_Mau, Ma_HTTT, Ma_KHMUA, Linh_vuc,
                    Ma_TTKH, So_luong, Gia_Tri, Pt_TC,
                    Noi_Cap_Cmt_Kh, Ngay_Cmt_Kh,
                    User_Name, Acti, Ma_TTCP, TK_Nh_Kh, Ten_Nh_Kh
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    '1900-01-01 00:00:00', '0', ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, '',
                    '', '', '', '',
                    '', '', 0, '',
                    '', '', '',
                    '', '', '',
                    '', '', '',
                    ?, '0',
                    '01', '02', '01', '01', ?,
                    '', '', '',
                    ?, ?, ?, '01', '',
                    ?, 0, 0, 0,
                    '', '1900-01-01 00:00:00',
                    ?, 1, ?, '', ''
                )
            """

            params = (
                ma_dvcs, ngay_tao, gio_tao, id_kh, c_name,
                ngay_tao,
                c_name, dia_chi, c_name, dia_chi,
                c_phone, c_phone, c_phone,
                ghi_chu,
                ma_ptlh,
                ma_kx, ma_mau, ma_httt,
                ma_ttkh,
                user_name,
                lead_ttcp
            )

            cursor.execute(sql_insert, params)
            created.append({
                "index": idx,
                "idKh": id_kh,
                "customerName": c_name,
                "tenKh": c_name,
                "phone": c_phone,
                "model": ma_kx,
                "userName": user_name
            })

        conn.commit()
        return {
            "success": True,
            "message": f"Đã nạp thành công {len(created)}/{len(leads)} khách hàng tiềm năng vào Cyber!",
            "data": {
                "createdCount": len(created),
                "errorCount": len(errors),
                "created": created,
                "errors": errors
            }
        }
    except Exception as e:
        conn.rollback()
        return {
            "success": False,
            "message": f"Lỗi trong quá trình nạp dữ liệu: {str(e)}",
            "errorCount": len(leads),
            "created": created,
            "errors": errors
        }
    finally:
        conn.close()

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--metadata":
        res = get_crm_metadata()
        print(json.dumps(res, ensure_ascii=False))
        return

    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"success": False, "error": "No input provided"}))
            return
        clean_input = raw_input.strip()
        if clean_input.startswith("\ufeff"):
            clean_input = clean_input[1:]
        payload = json.loads(clean_input)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {str(e)}"}))
        return

    action = payload.get("action")
    if action == "metadata" or payload.get("metadata"):
        res = get_crm_metadata()
        print(json.dumps(res, ensure_ascii=False))
    elif action == "check_duplicates":
        phones = payload.get("phones", [])
        res = check_duplicates(phones)
        print(json.dumps(res, ensure_ascii=False))
    elif action == "import_khtn":
        user_name = payload.get("userName") or payload.get("user_name")
        leads = payload.get("leads", [])
        ma_dvcs = payload.get("maDvcs", "02")
        ma_ttcp = payload.get("maTtcp") or payload.get("ma_ttcp") or "02.01.08"
        res = import_bulk_khtn(user_name, leads, ma_dvcs=ma_dvcs, ma_ttcp=ma_ttcp)
        print(json.dumps(res, ensure_ascii=False))
    else:
        print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))

if __name__ == "__main__":
    main()
