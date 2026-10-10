import os
import sys
import json
import csv
import pymssql
from datetime import datetime

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
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

        # 1. LẤY TOÀN BỘ KÝ MỚI (PHHDX)
        sql_ky_moi = """
            SELECT 
                h.Ma_TTCP_H,
                h.so_ct,
                CONVERT(VARCHAR(10), h.ngay_ct, 103) as ngay_ky,
                h.Ten_kh as ten_kh,
                ISNULL(h.Dien_Thoai, '') as dien_thoai,
                ISNULL(hs.Ten_Hs, h.Ma_Hs_H) as tvbh,
                ISNULL(ct70.Ma_Kx, '') as ma_kx,
                ISNULL(kx.Ten_Kx, ct70.Ma_Kx) as ten_kx,
                ISNULL(ct70.Ma_Mau, '') as ma_mau,
                ISNULL(mau.Ten_Mau, ct70.Ma_Mau) as ten_mau,
                ISNULL(ct70.tien, 0) as gia_tri,
                ISNULL(h.So_donhang, '') as so_don_hang
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
            ORDER BY h.ngay_ct DESC, h.Ma_TTCP_H
        """
        cursor.execute(sql_ky_moi)
        rows_ky_moi = cursor.fetchall()
        for r in rows_ky_moi:
            r['showroom'] = ttcp_map.get(r['Ma_TTCP_H'], r['Ma_TTCP_H'])

        # 2. LẤY TOÀN BỘ XUẤT HOÁ ĐƠN (PHHDC)
        sql_xhd = """
            SELECT 
                h.Ma_TTCP_H,
                h.so_ct as so_hoa_don,
                CONVERT(VARCHAR(10), h.ngay_ct, 103) as ngay_hd,
                ISNULL(h.ten_khVAT, '') as ten_kh,
                ISNULL(hs.Ten_Hs, h.Ma_Hs_H) as tvbh,
                ISNULL(ct.Ma_Kx, '') as ma_kx,
                ISNULL(kx.Ten_Kx, ct.Ma_Kx) as ten_kx,
                ISNULL(ct.Ma_Mau, '') as ma_mau,
                ISNULL(mau.Ten_Mau, ct.Ma_Mau) as ten_mau,
                ISNULL(ct.So_khung, '') as so_khung,
                ISNULL(ct.So_May, '') as so_may,
                ISNULL(ct.ma_hd_i, '') as so_hop_dong,
                ISNULL(h.t_tt, 0) as tong_thanh_toan
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
            ORDER BY h.ngay_ct DESC, h.Ma_TTCP_H
        """
        cursor.execute(sql_xhd)
        rows_xhd = cursor.fetchall()
        for r in rows_xhd:
            r['showroom'] = ttcp_map.get(r['Ma_TTCP_H'], r['Ma_TTCP_H'])

        output_dir = os.path.join(_BASE_DIR, "scripts", "cyber_data")
        os.makedirs(output_dir, exist_ok=True)
        
        # Lưu JSON
        json_file = os.path.join(output_dir, "cyber_ky_moi_xhd_oct2026.json")
        data_clean_ky_moi = [
            {k: (float(v) if hasattr(v, 'as_integer_ratio') else str(v) if v is not None else "") for k, v in r.items()}
            for r in rows_ky_moi
        ]
        data_clean_xhd = [
            {k: (float(v) if hasattr(v, 'as_integer_ratio') else str(v) if v is not None else "") for k, v in r.items()}
            for r in rows_xhd
        ]
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump({
                "ky_moi": data_clean_ky_moi,
                "xhd": data_clean_xhd
            }, f, ensure_ascii=False, indent=2)

        # Xuất file CSV UTF-8 with BOM (Mở bằng Excel tiếng Việt chuẩn 100%)
        csv_ky_moi = os.path.join(output_dir, "Bao_Cao_Ky_Moi_01_10_2026.csv")
        with open(csv_ky_moi, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                'showroom', 'Ma_TTCP_H', 'so_ct', 'ngay_ky', 'ten_kh', 'dien_thoai', 
                'tvbh', 'ma_kx', 'ten_kx', 'ma_mau', 'ten_mau', 'gia_tri', 'so_don_hang'
            ])
            writer.writeheader()
            for r in data_clean_ky_moi:
                writer.writerow(r)

        csv_xhd = os.path.join(output_dir, "Bao_Cao_Xuat_Hoa_Don_01_10_2026.csv")
        with open(csv_xhd, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                'showroom', 'Ma_TTCP_H', 'so_hoa_don', 'ngay_hd', 'ten_kh', 'tvbh',
                'ma_kx', 'ten_kx', 'ma_mau', 'ten_mau', 'so_khung', 'so_may',
                'so_hop_dong', 'tong_thanh_toan'
            ])
            writer.writeheader()
            for r in data_clean_xhd:
                writer.writerow(r)

        print(f"DONE_EXPORT: Ky_Moi={len(rows_ky_moi)}, XHD={len(rows_xhd)}")
        print(f"CSV_KY_MOI: {csv_ky_moi}")
        print(f"CSV_XHD: {csv_xhd}")

    finally:
        conn.close()

if __name__ == "__main__":
    main()
