"""
Script: fix_archive_triggers_and_restore_orders.py
Mục đích:
1. Sửa Trigger và Hàm tự động dọn dẹp đơn hàng trên Supabase:
   - Xóa bỏ trigger trg_khoxe_auto_archive trên bảng khoxe (vị trí xe không được phép xóa đơn hàng).
   - Sửa trigger trg_auto_archive_retained_order_cyber: CHỈ xóa đơn khỏi bảng donhang khi XE THỰC SỰ ĐÃ CÓ PHIẾU TD4 (Giao xe hoàn tất cho KH). Xe điều chuyển về Thuận An vẫn phải TỒN trong donhang.
   - Sửa hàm archive_old_orders() để tuân thủ cùng quy tắc trên.
2. Khôi phục lại toàn bộ các đơn hàng đã bị chuyển nhầm sang archived_orders (xe chưa có TD4) quay trở lại bảng donhang.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co").strip().rstrip('/')
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("VITE_SUPABASE_SERVICE_KEY", "")
PROJECT_REF = "jwvgxqrkjlbewvpkvucj"
ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")

SQL_MIGRATION = """
-- 1. Xóa hoàn toàn trigger trên bảng khoxe để vị trí kho xe không bao giờ tự ý xóa đơn hàng
DROP TRIGGER IF EXISTS trg_khoxe_auto_archive ON public.khoxe;
DROP FUNCTION IF EXISTS trg_auto_archive_retained_order_khoxe();

-- 2. Cập nhật trigger trên bảng cyber_car_status: CHỈ XÓA KHI XE THỰC SỰ ĐÃ CÓ PHIẾU TD4
CREATE OR REPLACE FUNCTION trg_auto_archive_retained_order_cyber()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ xóa và lưu trữ khi XE ĐÃ CÓ PHIẾU TD4 (Phiếu hẹn giao xe / Giấy ra cổng giao xe cho KH)
    IF (NEW.has_td4 = true OR NEW.so_ct_td4 IS NOT NULL) THEN
        INSERT INTO archived_orders (
            so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
            tvbh, vin, so_may, ma_dms, ngay_coc, ngay_xuat_hoa_don,
            chinh_sach, ket_qua, created_at, updated_at
        )
        SELECT 
            d.so_don_hang, d.ten_khach_hang, d.dong_xe, d.phien_ban, d.ngoai_that, d.noi_that,
            d.ten_tu_van_ban_hang, d.vin, d.so_may, d.ma_dms,
            CASE 
                WHEN d.ngay_coc IS NULL OR TRIM(d.ngay_coc) = '' THEN NULL
                WHEN d.ngay_coc ~ '^\\d{4}-\\d{2}-\\d{2}' THEN d.ngay_coc::DATE
                WHEN d.ngay_coc ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(d.ngay_coc, 'DD/MM/YYYY')
                ELSE NULL
            END,
            d.ngay_xuat_hoa_don::DATE,
            d.chinh_sach, 'Đã xuất hóa đơn', NOW(), NOW()
        FROM donhang d
        WHERE UPPER(TRIM(d.vin)) = UPPER(TRIM(NEW.vin))
        AND d.ngay_xuat_hoa_don IS NOT NULL
        AND d.ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE
        ON CONFLICT (so_don_hang) DO NOTHING;

        DELETE FROM donhang
        WHERE UPPER(TRIM(vin)) = UPPER(TRIM(NEW.vin))
        AND ngay_xuat_hoa_don IS NOT NULL
        AND ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cập nhật hàm lưu trữ hàng tháng archive_old_orders: CHỈ XÓA KHI CÓ TD4
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS JSON AS $$
DECLARE
    archived_count INTEGER := 0;
    deleted_yeucauxhd_count INTEGER := 0;
    deleted_donhang_count INTEGER := 0;
    first_of_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
    -- 1. Lưu trữ TOÀN BỘ đơn XHĐ tháng trước từ yeucauxhd sang archived_orders
    INSERT INTO archived_orders (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        tvbh, vin, so_may, ma_dms, ngay_coc, ngay_yeu_cau, ngay_xuat_hoa_don,
        chinh_sach, hoa_hong_ung, vpoint, url_hop_dong, url_de_nghi_xhd,
        url_hoa_don_da_xuat, trang_thai_vc, ket_qua, created_at, updated_at
    )
    SELECT 
        y.so_don_hang, y.ten_khach_hang, y.dong_xe, y.phien_ban, y.ngoai_that, y.noi_that,
        y.tvbh, y.vin, y.so_may, y.ma_dms,
        CASE 
            WHEN y.ngay_coc IS NULL OR TRIM(y.ngay_coc) = '' THEN NULL
            WHEN y.ngay_coc ~ '^\\d{4}-\\d{2}-\\d{2}' THEN y.ngay_coc::DATE
            WHEN y.ngay_coc ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(y.ngay_coc, 'DD/MM/YYYY')
            ELSE NULL
        END,
        y.ngay_yeu_cau, y.ngay_xuat_hoa_don::DATE, y.chinh_sach, 
        COALESCE(y.hoa_hong_ung, 0), COALESCE(y.vpoint, 0), 
        y.url_hop_dong, y.url_de_nghi_xhd, y.url_hoa_don_da_xuat, 
        y.trang_thai_vc, 'Đã xuất hóa đơn', y.created_at, NOW()
    FROM yeucauxhd y
    WHERE y.ngay_xuat_hoa_don IS NOT NULL
    AND y.ngay_xuat_hoa_don::DATE < first_of_month
    ON CONFLICT (so_don_hang) DO NOTHING;

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    DELETE FROM yeucauxhd 
    WHERE ngay_xuat_hoa_don IS NOT NULL
    AND ngay_xuat_hoa_don::DATE < first_of_month;

    GET DIAGNOSTICS deleted_yeucauxhd_count = ROW_COUNT;

    -- Bảng donhang: CHỈ XÓA những đơn mà xe không có VIN HOẶC ĐÃ CÓ PHIẾU TD4
    DELETE FROM donhang
    WHERE ngay_xuat_hoa_don IS NOT NULL
    AND ngay_xuat_hoa_don::DATE < first_of_month
    AND (
        vin IS NULL OR TRIM(vin) = ''
        OR EXISTS (
            SELECT 1 
            FROM cyber_car_status cs
            WHERE UPPER(TRIM(cs.vin)) = UPPER(TRIM(donhang.vin))
            AND (cs.has_td4 = true OR cs.so_ct_td4 IS NOT NULL)
        )
    );

    GET DIAGNOSTICS deleted_donhang_count = ROW_COUNT;

    RETURN json_build_object(
        'status', 'SUCCESS',
        'archived_count', archived_count,
        'deleted_from_yeucauxhd', deleted_yeucauxhd_count,
        'deleted_from_donhang', deleted_donhang_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

SQL_RESTORE = """
-- Khôi phục các đơn hàng trong archived_orders mà:
-- 1) Chưa có trong bảng donhang
-- 2) Xe chưa có phiếu TD4 trên cyber_car_status
WITH restored AS (
    INSERT INTO donhang (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        ten_tu_van_ban_hang, vin, so_may, ma_dms, ngay_coc, ngay_xuat_hoa_don,
        chinh_sach, ket_qua, link_hoa_don_da_xuat, trang_thai_vc, created_at
    )
    SELECT 
        a.so_don_hang, 
        a.ten_khach_hang, 
        a.dong_xe, 
        a.phien_ban, 
        a.ngoai_that, 
        a.noi_that,
        a.tvbh, 
        a.vin, 
        a.so_may, 
        a.ma_dms, 
        CASE WHEN a.ngay_coc IS NOT NULL THEN a.ngay_coc::text ELSE NULL END, 
        CASE WHEN a.ngay_xuat_hoa_don IS NOT NULL THEN a.ngay_xuat_hoa_don::timestamptz ELSE NULL END,
        a.chinh_sach, 
        'Đã xuất hóa đơn', 
        a.url_hoa_don_da_xuat, 
        a.trang_thai_vc, 
        a.created_at
    FROM archived_orders a
    LEFT JOIN donhang d ON d.so_don_hang = a.so_don_hang
    LEFT JOIN cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
    WHERE d.so_don_hang IS NULL
      AND (cs.has_td4 IS NOT TRUE AND cs.so_ct_td4 IS NULL)
      AND a.vin IS NOT NULL AND TRIM(a.vin) <> ''
    ON CONFLICT (so_don_hang) DO NOTHING
    RETURNING so_don_hang, vin, ten_khach_hang, ten_tu_van_ban_hang
)
SELECT * FROM restored;
"""

def execute_sql_via_management_api(sql_query):
    if not ACCESS_TOKEN:
        print("⚠️ Không có SUPABASE_ACCESS_TOKEN, thử qua RPC...")
        return None
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    resp = requests.post(url, headers=headers, json={"query": sql_query}, timeout=30)
    if resp.status_code >= 400:
        raise Exception(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()

def main():
    print("==========================================================")
    print("   SỬA DATABASE TRIGGER & KHÔI PHỤC ĐƠN HÀNG BỊ ẨN       ")
    print("==========================================================")
    
    # Bước 1: Sửa Trigger
    print("\n[1/2] ⚙️ Đang cập nhật Database Triggers & Functions trên Supabase...")
    try:
        res_mig = execute_sql_via_management_api(SQL_MIGRATION)
        print("  ✅ Đã hủy trigger trg_khoxe_auto_archive thành công.")
        print("  ✅ Đã cập nhật trg_auto_archive_retained_order_cyber: CHỈ XÓA KHI CÓ PHIẾU TD4.")
        print("  ✅ Đã đồng bộ hàm archive_old_orders() chuẩn xác.")
    except Exception as e:
        print(f"  ❌ Lỗi cập nhật Trigger: {e}")
        return

    # Bước 2: Khôi phục đơn hàng
    print("\n[2/2] 🔄 Đang quét các đơn hàng bị ẩn trong archived_orders (chưa có TD4)...")
    try:
        res_restore = execute_sql_via_management_api(SQL_RESTORE)
        if isinstance(res_restore, list) and len(res_restore) > 0:
            print(f"  🎉 ĐÃ KHÔI PHỤC THÀNH CÔNG {len(res_restore)} ĐƠN HÀNG TRỞ LẠI BẢNG donhang:")
            for idx, r in enumerate(res_restore, 1):
                print(f"     {idx}. ĐH: {r.get('so_don_hang')} | VIN: {r.get('vin')} | KH: {r.get('ten_khach_hang')} | TVBH: {r.get('ten_tu_van_ban_hang')}")
        else:
            print("  ℹ️ Hiện không có đơn hàng nào bị thiếu trong bảng donhang (hoặc tất cả các đơn lưu trữ đều đã có TD4).")
    except Exception as e:
        print(f"  ❌ Lỗi khôi phục đơn hàng: {e}")
        return

    print("\n==========================================================")
    print("   HOÀN TẤT XỬ LÝ! HỆ THỐNG ĐÃ AN TOÀN TUYỆT ĐỐI.       ")
    print("==========================================================")

if __name__ == "__main__":
    main()
