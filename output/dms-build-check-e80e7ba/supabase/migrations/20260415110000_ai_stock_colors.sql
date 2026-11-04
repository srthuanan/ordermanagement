CREATE OR REPLACE FUNCTION public.ai_full_context()
RETURNS JSON AS $$
DECLARE
    ctx JSON;
BEGIN
    SELECT json_build_object(
        -- Thống kê tổng quan
        'stats', (
            SELECT json_build_object(
                'total_orders', (SELECT count(*) FROM public.donhang),
                'total_stock', (SELECT count(*) FROM public.khoxe),
                'stock_available', (SELECT count(*) FROM public.khoxe WHERE trang_thai = 'Chưa ghép'),
                'stock_holding', (SELECT count(*) FROM public.khoxe WHERE trang_thai = 'Đang giữ'),
                'stock_matched', (SELECT count(*) FROM public.khoxe WHERE trang_thai = 'Đã ghép'),
                'pending_invoices', (SELECT count(*) FROM public.yeucauxhd WHERE ngay_xuat_hoa_don IS NULL),
                'pending_transport', (SELECT count(*) FROM public.yeucauvc WHERE trang_thai_xu_ly = 'Chờ duyệt ycvc'),
                'pending_inquiries', (SELECT count(*) FROM public.car_inquiries WHERE status = 'pending')
            )
        ),
        
        -- Phân bổ đơn hàng theo trạng thái
        'order_status_breakdown', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT COALESCE(ket_qua, 'Chưa xử lý') as trang_thai, count(*) as so_luong
                FROM public.donhang
                GROUP BY ket_qua
                ORDER BY so_luong DESC
            ) t
        ),
        
        -- Tổng kết kho xe theo dòng xe và MÀU SẮC (Cải tiến)
        'stock_by_model', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT COALESCE(dong_xe, 'Khác') as dong_xe, 
                       COALESCE(ngoai_that, 'Chưa rõ') as ngoai_that,
                       count(*) as tong,
                       count(*) FILTER (WHERE trang_thai = 'Chưa ghép') as ranh,
                       count(*) FILTER (WHERE trang_thai = 'Đang giữ') as dang_giu,
                       count(*) FILTER (WHERE trang_thai = 'Đã ghép') as da_ghep
                FROM public.khoxe
                GROUP BY dong_xe, ngoai_that
                ORDER BY dong_xe ASC, tong DESC
            ) t
        ),
        
        -- 20 đơn hàng mới nhất
        'recent_orders', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT so_don_hang, ten_khach_hang, ket_qua, vin, dong_xe,
                       ten_tu_van_ban_hang as tvbh, thoi_gian_nhap
                FROM public.donhang
                ORDER BY thoi_gian_nhap DESC NULLS LAST
                LIMIT 20
            ) t
        ),
        
        -- Top TVBH theo số đơn hàng
        'tvbh_ranking', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT ten_tu_van_ban_hang as tvbh, count(*) as so_don
                FROM public.donhang
                WHERE ten_tu_van_ban_hang IS NOT NULL AND ten_tu_van_ban_hang != ''
                GROUP BY ten_tu_van_ban_hang
                ORDER BY so_don DESC
                LIMIT 10
            ) t
        ),
        
        -- Xe đang bị giữ
        'held_cars', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT vin, dong_xe, phien_ban, ngoai_that, nguoi_giu_xe, 
                       thoi_gian_het_han_giu
                FROM public.khoxe
                WHERE trang_thai = 'Đang giữ'
                ORDER BY thoi_gian_het_han_giu ASC NULLS LAST
                LIMIT 20
            ) t
        ),
        
        -- Yêu cầu tìm xe chưa xử lý
        'pending_inquiries', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT tvbh_name, model, version, exterior_color, interior_color, 
                       status, created_at
                FROM public.car_inquiries
                WHERE status IN ('pending', 'not_found', 'auto_checking')
                ORDER BY created_at DESC
                LIMIT 10
            ) t
        )
    ) INTO ctx;

    RETURN ctx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
