-- Migration: Tối ưu hóa truy vấn cho Trợ Lý Ảo (Giảm tải hệ thống)
-- Mục đích: Tạo hàm tập hợp dữ liệu phía Server để tránh việc tải hàng ngàn dòng về Client gây nghẽn.

CREATE OR REPLACE FUNCTION get_ai_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    total_orders INTEGER;
    status_counts JSON;
    recent_entries JSON;
    stock_summary JSON;
BEGIN
    -- 1. Đếm tổng số đơn cực nhanh (không quét toàn bảng)
    SELECT count(*) INTO total_orders FROM public.donhang;
    
    -- 2. Thống kê trạng thái trực tiếp bằng SQL (cực nhẹ)
    SELECT json_object_agg(COALESCE(ket_qua, 'Chưa XL'), count)
    INTO status_counts
    FROM (
        SELECT ket_qua, count(*) as count
        FROM public.donhang
        GROUP BY ket_qua
    ) t;

    -- 3. Lấy 30 đơn hàng mới nhất (Chỉ lấy cột cần thiết)
    SELECT json_agg(t) INTO recent_entries FROM (
        SELECT so_don_hang, ten_khach_hang, ket_qua, thoi_gian_nhap, vin, tvbh
        FROM public.donhang
        ORDER BY thoi_gian_nhap DESC
        LIMIT 30
    ) t;

    -- 4. Tóm tắt 30 xe rảnh (Chỉ lấy cột cần thiết)
    SELECT json_agg(t) INTO stock_summary FROM (
        SELECT vin, dong_xe, phien_ban, ngoai_that, trang_thai
        FROM public.khoxe
        WHERE trang_thai = 'Chưa ghép'
        LIMIT 30
    ) t;

    RETURN json_build_object(
        'overall_stats', json_build_object(
            'total_orders', total_orders,
            'by_status', status_counts
        ),
        'recent_orders', recent_entries,
        'stock_summary', stock_summary
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
