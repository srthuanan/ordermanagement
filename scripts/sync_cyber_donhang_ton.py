"""
Script: sync_cyber_donhang_ton.py
Mục đích: Đồng bộ tự động các đơn hàng / hợp đồng cọc tồn từ tháng 7/2026 đến nay
của các TVBH đang hoạt động tại Showroom VinFast Thuận An (02.01.08) lên bảng `donhang_ton` trên Supabase.
"""

import os
import sys
import json
import pymssql
import requests
from datetime import datetime

# Cấu hình Cyber SQL Server
CYBER_SERVER = os.environ.get("CYBER_SERVER", "SQLVanDao.Cybersoft.com.vn")
CYBER_PORT = int(os.environ.get("CYBER_PORT", 7521))
CYBER_USER = os.environ.get("CYBER_USER", "")
CYBER_PWD = os.environ.get("CYBER_PWD", "")
CYBER_DB = os.environ.get("CYBER_DB", "CyberAppGolden_VanDao")

# Cấu hình Supabase
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co").strip().rstrip('/')
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY", "")
SUPABASE_MGMT_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")

def fetch_cyber_pending_contracts(from_date="2026-07-01", ma_ttcp="02.01.08"):
    """
    Truy vấn toàn bộ hợp đồng cọc tồn của TVBH đang làm việc tại Thuận An từ ngày from_date đến nay.
    Tuân thủ nghiêm ngặt Cyber MSSQL Query Protocol.
    """
    conn = pymssql.connect(
        server=CYBER_SERVER,
        port=CYBER_PORT,
        user=CYBER_USER,
        password=CYBER_PWD,
        database=CYBER_DB,
        timeout=35,
        appname='CyberAppGolden',
        autocommit=True
    )
    
    try:
        cursor = conn.cursor(as_dict=True)
        cursor.execute("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;")
        
        # Danh sách các HĐ đã có lệnh chi hoàn cọc qua ngân hàng (BN1)
        refunded_so_ct = [
            '02.0527/06/2026/HĐMB-MDP', '02.0826/05/2025/HĐMB-MDP', '02.0436/06/2026/HĐMB-MDP',
            '02.1300/03/2026/HĐMB-MDP', '02.1412/11/2025/HĐMB-MDP', '02.0049/06/2026/HĐMB-MDP',
            '02.2975/03/2026/HĐMB-MDP', '02.0840/06/2026/HĐMB-MDP', '02.0809/04/2026/HĐMB-MDP',
            '02.1429/03/2026/HĐMB-MDP', '02.2600/03/2026/HĐMB-MDP', '02.2794/03/2026/HĐMB-MDP',
            '02.0259/05/2026/HĐMB-MDP', '02.0805/05/2026/HĐMB-MDP', '02.0243/07/2026/HĐMB-MDP',
            '02.0140/06/2025/HĐMB-MDP', '02.0105/12/2025/HĐMB-MDP', '02.0033/02/2025/HĐMB-MDP'
        ]
        ph_refund = ",".join([f"'{s}'" for s in refunded_so_ct])
        
        sql = f"""
            SELECT 
                h.stt_rec,
                h.so_ct, 
                h.ngay_ct,
                h.Ma_Hs_H, 
                ISNULL(hs.Ten_Hs, h.Ma_Hs_H) as ten_tvbh,
                u.User_Name as tvbh_username,
                ISNULL(u.Acti, 1) as tvbh_acti,
                h.Ten_kh as ten_kh, 
                h.ong_ba,
                h.Dien_Thoai as dien_thoai,
                h.Ma_Post,
                ISNULL(post.Ten_Post, h.Ma_Post) as ten_post,
                h.t_tien as gia_tri_hd,
                h.So_donhang as so_don_hang,
                ISNULL(ct70.Ma_Kx, '') as ma_kx,
                ISNULL(kx.Ten_Kx, ct70.Ma_Kx) as ten_kx,
                ISNULL(ct70.Ma_Mau, '') as ma_mau,
                ISNULL(mau.Ten_Mau, ct70.Ma_Mau) as ten_mau,
                ISNULL(p.tien_thu, 0) as tien_thu,
                ISNULL(bx.So_Khung, '') as so_khung,
                CASE WHEN hdc.so_ct IS NOT NULL THEN 1 ELSE 0 END as da_xuat_hd
            FROM PHHDX h WITH (NOLOCK)
            LEFT JOIN DmHs hs WITH (NOLOCK) ON h.Ma_Hs_H = hs.Ma_Hs
            LEFT JOIN Userinfo u WITH (NOLOCK) ON h.Ma_Hs_H = u.Ma_Hs
            LEFT JOIN DmPost post WITH (NOLOCK) ON post.Ma_Ct = 'HDX' AND post.Ma_Post = h.Ma_Post
            OUTER APPLY (
                SELECT TOP 1 c.Ma_Kx, c.Ma_Mau
                FROM CT70HDX c WITH (NOLOCK)
                WHERE c.stt_rec = h.stt_rec
            ) ct70
            LEFT JOIN DmKx kx WITH (NOLOCK) ON ct70.Ma_Kx = kx.Ma_Kx
            LEFT JOIN DmMauxe mau WITH (NOLOCK) ON ct70.Ma_Mau = mau.Ma_Mau
            OUTER APPLY (
                SELECT SUM(Ps) as tien_thu
                FROM CT00 c WITH (NOLOCK)
                WHERE c.Ma_HD = h.so_ct AND c.Tk_Co LIKE '1311%'
            ) p
            OUTER APPLY (
                SELECT TOP 1 so_ct
                FROM PHHDC c WITH (NOLOCK)
                WHERE c.Ma_hd_H = h.so_ct
            ) hdc
            OUTER APPLY (
                SELECT TOP 1 So_Khung
                FROM BEXEPXE b WITH (NOLOCK)
                WHERE b.Ma_Hd = h.so_ct
            ) bx
            WHERE h.Ma_TTCP_H = %s
              AND h.ngay_ct >= %s
              AND h.Huy = 0 
              AND h.Ma_Post <> '1'
              AND ISNULL(p.tien_thu, 0) > 0
              AND hdc.so_ct IS NULL
              AND u.Acti = 1
              AND h.so_ct NOT IN ({ph_refund})
            ORDER BY h.ngay_ct DESC
        """
        
        cursor.execute(sql, (ma_ttcp, from_date))
        rows = cursor.fetchall()
        return rows
    finally:
        conn.close()

def sync_to_supabase(contracts):
    """Đồng bộ danh sách đơn hàng tồn vào bảng donhang_ton trên Supabase."""
    records = []
    for c in contracts:
        so_ct = c['so_ct']
        tvbh = c['ten_tvbh'].strip()
        kh = c['ten_kh'].strip()
        sdt = (c.get('dien_thoai') or '').strip()
        kx = (c.get('ten_kx') or '').strip()
        mau = (c.get('ten_mau') or '').strip()
        tien = float(c.get('tien_thu') or 0)
        gia_tri = float(c.get('gia_tri_hd') or 0)
        ngay_ct = c['ngay_ct'].strftime('%Y-%m-%d') if hasattr(c['ngay_ct'], 'strftime') else str(c.get('ngay_ct', ''))[:10]
        vin = (c.get('so_khung') or '').strip()
        post = c.get('ten_post') or c.get('Ma_Post') or 'Chờ duyệt'
        
        rec = {
            "so_don_hang": so_ct,
            "so_hop_dong": so_ct,
            "tvbh_name": tvbh,
            "khach_hang": kh,
            "so_dien_thoai": sdt,
            "phien_ban": kx,
            "ngoai_that": mau or "Tiêu chuẩn",
            "noi_that": "Tiêu chuẩn",
            "tien_coc": tien,
            "gia_tri_hd": gia_tri,
            "ngay_hop_dong": ngay_ct,
            "ngay_giao_dich": ngay_ct,
            "vin": vin,
            "ma_post": c.get('Ma_Post') or '',
            "ten_post": post,
            "stt_rec": c.get('stt_rec') or '',
            "ghi_chu": f"HĐ Cyber {so_ct} | Đã thu: {tien:,.0f} đ | {post}",
            "status": post
        }
        records.append(rec)
    
    # Xóa sạch các đơn tồn cũ và nạp mới toàn bộ
    mgmt_url = "https://api.supabase.com/v1/projects/jwvgxqrkjlbewvpkvucj/database/query"
    mgmt_headers = {
        "Authorization": f"Bearer {SUPABASE_MGMT_TOKEN}",
        "Content-Type": "application/json"
    }
    requests.post(mgmt_url, headers=mgmt_headers, json={"query": "DELETE FROM public.donhang_ton;"})

    # Upsert danh sách mới
    url = f"{SUPABASE_URL}/rest/v1/donhang_ton"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    res = requests.post(url, headers=headers, json=records)
    return res.status_code in (200, 201), len(records)

def run_sync_donhang_ton():
    """Hàm callable cho cyber_server.py và các service khác."""
    try:
        contracts = fetch_cyber_pending_contracts()
        ok, count = sync_to_supabase(contracts)
        return {
            "success": ok,
            "total": count,
            "message": f"Đồng bộ thành công {count} đơn cọc tồn từ Cyber" if ok else "Lỗi khi lưu vào Supabase"
        }
    except Exception as e:
        return {
            "success": False,
            "total": 0,
            "error": str(e),
            "message": f"Lỗi đồng bộ Cyber: {str(e)}"
        }

def main():
    res = run_sync_donhang_ton()
    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
