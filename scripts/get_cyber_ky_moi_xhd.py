import os
import sys
import pymssql

CYBER_SERVER = "SQLVanDao.Cybersoft.com.vn"
CYBER_PORT = 7521
CYBER_USER = "cyber_vandao"
CYBER_PWD = "HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv"
CYBER_DB = "CyberAppGolden_VanDao"

ttcp_map = {
    '02.01.07': 'Ba Tháng Hai',
    '02.01.08': 'Thuận An',
    '02.01.12': 'Vũng Tàu',
    '02.01.20': 'Hà Huy Giáp',
    '02.01.21': 'Phạm Văn Đồng'
}

def main():
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

        print("=== PHHDX MA_POST PHÂN BỔ TỪ 2026-10-01 ===")
        cursor.execute("""
            SELECT h.Ma_TTCP_H, h.Ma_Post, h.Huy, COUNT(*) as cnt
            FROM PHHDX h WITH (NOLOCK)
            WHERE h.ngay_ct >= '2026-10-01'
              AND h.Ma_TTCP_H IN ('02.01.07', '02.01.08', '02.01.12', '02.01.20', '02.01.21')
            GROUP BY h.Ma_TTCP_H, h.Ma_Post, h.Huy
            ORDER BY h.Ma_TTCP_H, h.Ma_Post
        """)
        for r in cursor.fetchall():
            print(f"  SR: {ttcp_map.get(r['Ma_TTCP_H'])} | Post: {r['Ma_Post']} | Huy: {r['Huy']} | SL: {r['cnt']}")

        print("\n=== MẪU DỮ LIỆU KÝ MỚI (PHHDX + CT70HDX) ===")
        cursor.execute("""
            SELECT TOP 5
                h.Ma_TTCP_H,
                h.so_ct,
                CONVERT(VARCHAR(10), h.ngay_ct, 103) as ngay_ky,
                h.Ten_kh,
                h.Dien_Thoai,
                ISNULL(hs.Ten_Hs, h.Ma_Hs_H) as tvbh,
                ct70.Ma_Kx,
                ISNULL(kx.Ten_Kx, ct70.Ma_Kx) as ten_kx,
                ct70.Ma_Mau,
                ISNULL(mau.Ten_Mau, ct70.Ma_Mau) as ten_mau,
                ct70.tien
            FROM PHHDX h WITH (NOLOCK)
            LEFT JOIN DmHs hs WITH (NOLOCK) ON h.Ma_Hs_H = hs.Ma_Hs
            OUTER APPLY (
                SELECT TOP 1 c.Ma_Kx, c.Ma_Mau, c.tien
                FROM CT70HDX c WITH (NOLOCK)
                WHERE c.stt_rec = h.stt_rec
            ) ct70
            LEFT JOIN DmKx kx WITH (NOLOCK) ON ct70.Ma_Kx = kx.Ma_Kx
            LEFT JOIN DmMauxe mau WITH (NOLOCK) ON ct70.Ma_Mau = mau.Ma_Mau
            WHERE h.ngay_ct >= '2026-10-01'
              AND h.Huy = 0
              AND h.Ma_TTCP_H IN ('02.01.07', '02.01.08', '02.01.12', '02.01.20', '02.01.21')
            ORDER BY h.ngay_ct DESC
        """)
        for r in cursor.fetchall():
            print(r)

        print("\n=== MẪU DỮ LIỆU XUẤT HOÁ ĐƠN (PHHDC + CTHDC) ===")
        cursor.execute("""
            SELECT TOP 5
                h.Ma_TTCP_H,
                h.so_ct,
                CONVERT(VARCHAR(10), h.ngay_ct, 103) as ngay_hd,
                h.ten_khVAT,
                ISNULL(hs.Ten_Hs, h.Ma_Hs_H) as tvbh,
                ct.Ma_Kx,
                ISNULL(kx.Ten_Kx, ct.Ma_Kx) as ten_kx,
                ct.Ma_Mau,
                ISNULL(mau.Ten_Mau, ct.Ma_Mau) as ten_mau,
                ct.So_khung,
                ct.So_May,
                ct.ma_hd_i as so_hop_dong,
                h.t_tt as tong_thanh_toan
            FROM PHHDC h WITH (NOLOCK)
            LEFT JOIN DmHs hs WITH (NOLOCK) ON h.Ma_Hs_H = hs.Ma_Hs
            OUTER APPLY (
                SELECT TOP 1 c.Ma_Kx, c.Ma_Mau, c.So_khung, c.So_May, c.ma_hd_i
                FROM CTHDC c WITH (NOLOCK)
                WHERE c.stt_rec = h.stt_rec
            ) ct
            LEFT JOIN DmKx kx WITH (NOLOCK) ON ct.Ma_Kx = kx.Ma_Kx
            LEFT JOIN DmMauxe mau WITH (NOLOCK) ON ct.Ma_Mau = mau.Ma_Mau
            WHERE h.ngay_ct >= '2026-10-01'
              AND h.Ma_TTCP_H IN ('02.01.07', '02.01.08', '02.01.12', '02.01.20', '02.01.21')
            ORDER BY h.ngay_ct DESC
        """)
        for r in cursor.fetchall():
            print(r)

    finally:
        conn.close()

if __name__ == "__main__":
    main()
