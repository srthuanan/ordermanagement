# -*- coding: utf-8 -*-
import os
import sys
import pymssql
from datetime import datetime

CYBER_SERVER = "SQLVanDao.Cybersoft.com.vn"
CYBER_PORT = 7521
CYBER_USER = "cyber_vandao"
CYBER_PWD = "HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv"
CYBER_DB = "CyberAppGolden_VanDao"

def main():
    print("=== KIỂM TRA XE ĐÃ XUẤT HÓA ĐƠN NHƯNG CHƯA ĐỦ TIỀN - THUẬN AN ===")
    
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
        
        sql = """
            SELECT 
                h.stt_rec,
                h.so_ct as so_hoa_don,
                CONVERT(VARCHAR(10), h.ngay_ct, 103) as ngay_hd,
                h.ngay_ct,
                ISNULL(h.ten_khVAT, '') as ten_kh,
                ISNULL(hs.Ten_Hs, h.Ma_Hs_H) as tvbh,
                ISNULL(ct.Ma_Kx, '') as ma_kx,
                ISNULL(kx.Ten_Kx, ct.Ma_Kx) as ten_kx,
                ISNULL(ct.Ma_Mau, '') as ma_mau,
                ISNULL(mau.Ten_Mau, ct.Ma_Mau) as ten_mau,
                ISNULL(ct.So_khung, '') as so_khung,
                ISNULL(ct.So_May, '') as so_may,
                ISNULL(ct.ma_hd_i, '') as so_hop_dong,
                ISNULL(h.t_tt, 0) as tong_tien_hd,
                ISNULL(thu.tien_thu_hd, 0) as tien_thu_theo_hd,
                ISNULL(thu_hdong.tien_thu_hop_dong, 0) as tien_thu_theo_hop_dong
            FROM PHHDC h WITH (NOLOCK)
            LEFT JOIN DmHs hs WITH (NOLOCK) ON h.Ma_Hs_H = hs.Ma_Hs
            OUTER APPLY (
                SELECT TOP 1 c.Ma_Kx, c.Ma_Mau, c.So_khung, c.So_May, c.ma_hd_i
                FROM CTHDC c WITH (NOLOCK)
                WHERE c.stt_rec = h.stt_rec
            ) ct
            LEFT JOIN DmKx kx WITH (NOLOCK) ON ct.Ma_Kx = kx.Ma_Kx
            LEFT JOIN DmMauxe mau WITH (NOLOCK) ON ct.Ma_Mau = mau.Ma_Mau
            OUTER APPLY (
                SELECT SUM(Ps) as tien_thu_hd
                FROM CT00 c WITH (NOLOCK)
                WHERE (c.Ma_HD = h.so_ct OR c.so_ct = h.so_ct) 
                  AND c.Tk_Co LIKE '131%'
            ) thu
            OUTER APPLY (
                SELECT SUM(Ps) as tien_thu_hop_dong
                FROM CT00 c WITH (NOLOCK)
                WHERE ct.ma_hd_i IS NOT NULL 
                  AND ct.ma_hd_i <> '' 
                  AND c.Ma_HD = ct.ma_hd_i 
                  AND c.Tk_Co LIKE '131%'
            ) thu_hdong
            WHERE h.Ma_TTCP_H = %s
              AND h.ngay_ct >= %s
            ORDER BY h.ngay_ct DESC
        """
        
        cursor.execute(sql, ('02.01.08', '2026-06-01'))
        rows = cursor.fetchall()
        print(f"Tổng số xe đã xuất hóa đơn tại Thuận An từ 01/06/2026 đến nay: {len(rows)} xe\n")
        
        unpaid_list = []
        for r in rows:
            tong_tien = float(r.get('tong_tien_hd') or 0)
            thu_hd = float(r.get('tien_thu_theo_hd') or 0)
            thu_hdx = float(r.get('tien_thu_theo_hop_dong') or 0)
            
            da_thu = max(thu_hd, thu_hdx)
            if thu_hd > 0 and thu_hdx > 0 and (thu_hd + thu_hdx) <= tong_tien + 500000:
                da_thu = thu_hd + thu_hdx

            con_thieu = tong_tien - da_thu
            
            # Lọc những xe còn thiếu trên 500.000 VNĐ
            if con_thieu > 500000:
                unpaid_list.append({
                    "ngay_hd": r.get('ngay_hd'),
                    "so_hoa_don": r.get('so_hoa_don'),
                    "so_hop_dong": r.get('so_hop_dong'),
                    "ten_kh": r.get('ten_kh'),
                    "tvbh": r.get('tvbh'),
                    "dong_xe": r.get('ten_kx'),
                    "mau_xe": r.get('ten_mau'),
                    "so_khung": r.get('so_khung'),
                    "tong_tien": tong_tien,
                    "da_thu": da_thu,
                    "con_thieu": con_thieu
                })
        
        print(f"🚨 TÌM THẤY {len(unpaid_list)} XE ĐÃ XUẤT HÓA ĐƠN NHƯNG CHƯA ĐỦ TIỀN:\n")
        print(f"{'STT':<3} | {'Ngày HĐ':<10} | {'Số HĐ':<10} | {'Khách hàng':<24} | {'Dòng xe':<9} | {'Số VIN (Khung)':<18} | {'Tổng tiền':<13} | {'Đã thu':<13} | {'Còn thiếu':<13} | {'TVBH':<14}")
        print("-" * 150)
        for idx, item in enumerate(unpaid_list, 1):
            print(f"{idx:<3} | {item['ngay_hd']:<10} | {item['so_hoa_don']:<10} | {item['ten_kh'][:23]:<24} | {item['dong_xe'][:8]:<9} | {item['so_khung']:<18} | {item['tong_tien']:>13,.0f} | {item['da_thu']:>13,.0f} | {item['con_thieu']:>13,.0f} | {item['tvbh'][:13]:<14}")

        tong_thieu = sum(x['con_thieu'] for x in unpaid_list)
        print("-" * 150)
        print(f"👉 TỔNG TIỀN CÒN THIẾU CẦN THU: {tong_thieu:,.0f} VNĐ\n")

    finally:
        conn.close()

if __name__ == "__main__":
    main()
