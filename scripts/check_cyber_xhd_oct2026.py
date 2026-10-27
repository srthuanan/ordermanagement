# -*- coding: utf-8 -*-
import os
import sys
import json
import pymssql
from datetime import datetime

CYBER_SERVER = "SQLVanDao.Cybersoft.com.vn"
CYBER_PORT = 7521
CYBER_USER = "cyber_vandao"
CYBER_PWD = "HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv"
CYBER_DB = "CyberAppGolden_VanDao"

def run():
    conn = pymssql.connect(
        server=CYBER_SERVER,
        port=CYBER_PORT,
        user=CYBER_USER,
        password=CYBER_PWD,
        database=CYBER_DB,
        timeout=45,
        appname='CyberAppGolden',
        autocommit=True
    )
    
    try:
        cursor = conn.cursor(as_dict=True)
        cursor.execute("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;")
        
        # 1. Lấy danh mục TTCP
        cursor.execute("""
            SELECT Ma_TTCP, Ten_TTCP 
            FROM DmTTCP WITH (NOLOCK)
        """)
        dm_ttcp = {r['Ma_TTCP']: r['Ten_TTCP'] for r in cursor.fetchall()}
        
        # 2. Kiểm tra các cột trong PHHDC (đặc biệt là Huy, Ma_Post)
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'PHHDC' AND COLUMN_NAME IN ('Huy', 'Ma_Post', 'Status', 'Ma_dvcs')
        """)
        cols = [r['COLUMN_NAME'] for r in cursor.fetchall()]
        has_huy = 'Huy' in cols
        
        # 3. Thống kê số lượng XHĐ theo từng Showroom từ 01/10/2026 đến nay
        where_extra = "AND h.Huy = 0" if has_huy else ""
        sql_summary = f"""
            SELECT 
                ISNULL(h.Ma_TTCP_H, 'KHAC') as Ma_TTCP,
                ISNULL(t.Ten_TTCP, h.Ma_TTCP_H) as Ten_Showroom,
                COUNT(DISTINCT h.stt_rec) as Tong_So_HD,
                COUNT(ct.stt_rec) as Tong_So_Xe,
                SUM(ISNULL(h.t_tt, 0)) as Tong_Gia_Tri
            FROM PHHDC h WITH (NOLOCK)
            LEFT JOIN DmTTCP t WITH (NOLOCK) ON h.Ma_TTCP_H = t.Ma_TTCP
            LEFT JOIN CTHDC ct WITH (NOLOCK) ON h.stt_rec = ct.stt_rec
            WHERE h.ngay_ct >= '2026-10-01'
              {where_extra}
            GROUP BY h.Ma_TTCP_H, t.Ten_TTCP
            ORDER BY Tong_So_HD DESC
        """
        cursor.execute(sql_summary)
        summary_rows = cursor.fetchall()
        
        # 4. Thống kê chi tiết theo dòng xe cho từng Showroom
        sql_by_model = f"""
            SELECT 
                ISNULL(h.Ma_TTCP_H, 'KHAC') as Ma_TTCP,
                ISNULL(t.Ten_TTCP, h.Ma_TTCP_H) as Ten_Showroom,
                ISNULL(kx.Ten_Kx, ct.Ma_Kx) as Ten_Kx,
                ct.Ma_Kx,
                COUNT(*) as So_Luong
            FROM PHHDC h WITH (NOLOCK)
            LEFT JOIN DmTTCP t WITH (NOLOCK) ON h.Ma_TTCP_H = t.Ma_TTCP
            JOIN CTHDC ct WITH (NOLOCK) ON h.stt_rec = ct.stt_rec
            LEFT JOIN DmKx kx WITH (NOLOCK) ON ct.Ma_Kx = kx.Ma_Kx
            WHERE h.ngay_ct >= '2026-10-01'
              {where_extra}
            GROUP BY h.Ma_TTCP_H, t.Ten_TTCP, kx.Ten_Kx, ct.Ma_Kx
            ORDER BY h.Ma_TTCP_H, So_Luong DESC
        """
        cursor.execute(sql_by_model)
        model_rows = cursor.fetchall()
        
        # In kết quả dạng JSON để dễ xử lý và đọc
        result = {
            "cols_checked": cols,
            "summary": summary_rows,
            "by_model": model_rows,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        
    finally:
        conn.close()

if __name__ == "__main__":
    run()
