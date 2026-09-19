import pyodbc, json, os
from datetime import datetime, date

CONN_STR = (
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=SQLVanDao.Cybersoft.com.vn,7521;'
    'DATABASE=CyberAppGolden_VanDao;'
    'UID=cyber_vandao;'
    'PWD=HyFleBEQKV191sBNeTFN3Fu0S@mfIQcnszfDcVqCZe7CiSqsszv;'
    'TrustServerCertificate=yes'
)

OUT = r'c:\Users\USER\Documents\ordermanagement\scripts\cyber_data'
os.makedirs(OUT, exist_ok=True)

def serial(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    return str(o)

def fetch(cursor, sql):
    cursor.execute(sql)
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, r)) for r in cursor.fetchall()]

conn = pyodbc.connect(CONN_STR, timeout=15)
c    = conn.cursor()
print('Connected!')

# 1. DmXe full
dmxe = fetch(c, 'SELECT TOP 500 * FROM DmXe ORDER BY Ngay_mua DESC')
with open(os.path.join(OUT,'dmxe.json'), 'w', encoding='utf-8') as f:
    json.dump(dmxe, f, ensure_ascii=False, indent=2, default=serial)
print(f'DmXe: {len(dmxe)} rows')

# 2. Hop dong ban xe PHHDX
hd = fetch(c, '''
    SELECT TOP 200
        h.so_ct, h.ngay_ct, h.ngay_lct, h.ma_kh,
        h.Ten_kh, h.ong_ba, h.Dien_Thoai,
        h.t_tien, h.So_BG, h.So_donhang, h.Ngay_donhang,
        h.Ma_TTCP_H, h.Ma_HTLL, h.Ngay_Hh,
        h.Ky_HD, h.Huy, h.Voucher
    FROM PHHDX h
    ORDER BY h.ngay_ct DESC
''')
with open(os.path.join(OUT,'hop_dong_ban_xe.json'), 'w', encoding='utf-8') as f:
    json.dump(hd, f, ensure_ascii=False, indent=2, default=serial)
print(f'PHHDX: {len(hd)} rows')

# 3. De nghi xuat xe PHDNX
dnx = fetch(c, '''
    SELECT TOP 200
        d.so_ct, d.ngay_ct, d.ma_kh, d.ong_ba,
        d.Ma_kho, d.Ma_khoN, d.t_so_luong, d.t_tien,
        d.dien_giai, d.MA_HD_H, d.Ma_TTCP_H
    FROM PHDNX d
    ORDER BY d.ngay_ct DESC
''')
with open(os.path.join(OUT,'de_nghi_xuat_xe.json'), 'w', encoding='utf-8') as f:
    json.dump(dnx, f, ensure_ascii=False, indent=2, default=serial)
print(f'PHDNX: {len(dnx)} rows')

# 4. Khach hang DmKh
kh = fetch(c, '''
    SELECT TOP 300 ma_kh, ten_kh, dien_thoai, e_mail, dia_chi,
           ma_tp, ma_quan, ma_so_thue, ghi_chu, Acti
    FROM DmKh ORDER BY ma_kh
''')
with open(os.path.join(OUT,'dmkh.json'), 'w', encoding='utf-8') as f:
    json.dump(kh, f, ensure_ascii=False, indent=2, default=serial)
print(f'DmKh: {len(kh)} rows')

conn.close()
print('DONE - Files saved to', OUT)
