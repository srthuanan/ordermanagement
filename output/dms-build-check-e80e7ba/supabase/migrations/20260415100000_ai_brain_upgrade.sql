-- =============================================================
-- Migration: NÂO BỘ AI PHIÊN BẢN 2.0 - Thám Tử Toàn Năng
-- Ngày: 2026-04-15
-- Mục đích: 
--   1. Tạo hàm ai_global_search tối ưu (tìm kiếm thông minh 10+ bảng)
--   2. Tạo hàm ai_full_context (gom toàn bộ dữ liệu dashboard trong 1 lệnh)
--   3. Cực kỳ nhẹ nhờ sử dụng Index + LIMIT + UNION ALL
-- =============================================================

-- =============================================
-- 1. HÀM THÁM TỬ: ai_global_search
-- Tìm kiếm thông minh trên TOÀN BỘ cơ sở dữ liệu
-- Luôn có LIMIT để không bao giờ gây quá tải
-- =============================================
DROP FUNCTION IF EXISTS public.ai_global_search(TEXT);
CREATE OR REPLACE FUNCTION public.ai_global_search(search_term TEXT)
RETURNS JSON AS $$
DECLARE
    results JSON;
    clean_term TEXT;
    is_vin BOOLEAN;
    is_order_no BOOLEAN;
    is_phone BOOLEAN;
BEGIN
    -- Chuẩn hóa từ khóa
    clean_term := TRIM(search_term);
    
    -- Phát hiện loại tìm kiếm
    is_vin := clean_term ~* '^[VR][A-Z0-9]{16}$';  -- VIN bắt đầu bằng V hoặc R, 17 ký tự
    is_order_no := clean_term ~* '^SO[0-9]+' OR clean_term ~* '^[0-9]{6,}$';  -- Số đơn hàng
    is_phone := clean_term ~* '^0[0-9]{9,10}$';     -- Số điện thoại

    SELECT json_build_object(
        'search_term', clean_term,
        'search_type', CASE
            WHEN is_vin THEN 'VIN'
            WHEN is_order_no THEN 'ORDER_NUMBER'
            WHEN is_phone THEN 'PHONE'
            ELSE 'TEXT'
        END,
        
        -- [BẢNG 1] Đơn hàng đang hoạt động
        'donhang', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT so_don_hang, ten_khach_hang, ket_qua, vin, dong_xe, phien_ban,
                       ngoai_that, ten_tu_van_ban_hang as tvbh, thoi_gian_nhap, ngay_coc,
                       ngay_xuat_hoa_don, ma_dms, so_may
                FROM public.donhang
                WHERE (is_vin AND vin ILIKE '%' || clean_term || '%')
                   OR (is_order_no AND so_don_hang ILIKE '%' || clean_term || '%')
                   OR (NOT is_vin AND NOT is_order_no AND (
                       ten_khach_hang ILIKE '%' || clean_term || '%'
                       OR ten_tu_van_ban_hang ILIKE '%' || clean_term || '%'
                       OR so_don_hang ILIKE '%' || clean_term || '%'
                       OR vin ILIKE '%' || clean_term || '%'
                       OR ket_qua ILIKE '%' || clean_term || '%'
                       OR dong_xe ILIKE '%' || clean_term || '%'
                   ))
                ORDER BY thoi_gian_nhap DESC NULLS LAST
                LIMIT 15
            ) t
        ),
        
        -- [BẢNG 2] Kho xe
        'khoxe', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT vin, dong_xe, phien_ban, ngoai_that, noi_that, trang_thai,
                       nguoi_giu_xe, username_giu_xe, thoi_gian_het_han_giu, so_may, ma_dms
                FROM public.khoxe
                WHERE (is_vin AND vin ILIKE '%' || clean_term || '%')
                   OR (NOT is_vin AND (
                       vin ILIKE '%' || clean_term || '%'
                       OR dong_xe ILIKE '%' || clean_term || '%'
                       OR phien_ban ILIKE '%' || clean_term || '%'
                       OR ngoai_that ILIKE '%' || clean_term || '%'
                       OR trang_thai ILIKE '%' || clean_term || '%'
                       OR nguoi_giu_xe ILIKE '%' || clean_term || '%'
                   ))
                LIMIT 15
            ) t
        ),
        
        -- [BẢNG 3] Yêu cầu xuất hóa đơn
        'yeucauxhd', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT so_don_hang, ten_khach_hang, tvbh, vin, dong_xe, phien_ban,
                       trang_thai_vc, ngay_yeu_cau, ngay_xuat_hoa_don, chinh_sach
                FROM public.yeucauxhd
                WHERE so_don_hang ILIKE '%' || clean_term || '%'
                   OR ten_khach_hang ILIKE '%' || clean_term || '%'
                   OR tvbh ILIKE '%' || clean_term || '%'
                   OR vin ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 4] Yêu cầu vận chuyển  
        'yeucauvc', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT so_don_hang, ten_khach_hang, nguoi_yc, loai_yc, 
                       trang_thai_xu_ly, vin, thoi_gian_yc, ghi_chu
                FROM public.yeucauvc
                WHERE so_don_hang ILIKE '%' || clean_term || '%'
                   OR ten_khach_hang ILIKE '%' || clean_term || '%'
                   OR nguoi_yc ILIKE '%' || clean_term || '%'
                   OR vin ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 5] Đơn hàng đã lưu trữ (Archived)
        'archived_orders', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT so_don_hang, ten_khach_hang, vin, dong_xe, tvbh, ket_qua,
                       ngay_xuat_hoa_don, archived_at
                FROM public.archived_orders
                WHERE so_don_hang ILIKE '%' || clean_term || '%'
                   OR ten_khach_hang ILIKE '%' || clean_term || '%'
                   OR vin ILIKE '%' || clean_term || '%'
                   OR tvbh ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 6] Yêu cầu tìm xe (Car Inquiries)
        'car_inquiries', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT id, tvbh_name, tvbh_email, model, version, 
                       exterior_color, interior_color, status, 
                       admin_response, matched_vin, created_at
                FROM public.car_inquiries
                WHERE tvbh_name ILIKE '%' || clean_term || '%'
                   OR model ILIKE '%' || clean_term || '%'
                   OR matched_vin ILIKE '%' || clean_term || '%'
                   OR version ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 7] Thông tin xe Master Data
        'thongtinxe', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT vin, phien_ban, mo_ta, ngoai_that, noi_that, so_may, 
                       khu_vuc, nam_san_xuat, ngay_nhan
                FROM public.thongtinxe
                WHERE vin ILIKE '%' || clean_term || '%'
                   OR phien_ban ILIKE '%' || clean_term || '%'
                   OR mo_ta ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 8] Đơn hàng hiện hữu (DMS)
        'donhanghienhuu', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT so_don_hang_ban, khach_hang_tiem_nang, tu_van_ban_hang,
                       mo_ta_san_pham, ten_phien_ban, mau_ngoai_that, so_vin,
                       trang_thai, ngay_xuat_hoa_don
                FROM public.donhanghienhuu
                WHERE so_don_hang_ban ILIKE '%' || clean_term || '%'
                   OR khach_hang_tiem_nang ILIKE '%' || clean_term || '%'
                   OR tu_van_ban_hang ILIKE '%' || clean_term || '%'
                   OR so_vin ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 9] Hoạt động giữ xe
        'car_hold_activities', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT vin, username, tvbh_name, type, status, created_at
                FROM public.car_hold_activities
                WHERE vin ILIKE '%' || clean_term || '%'
                   OR tvbh_name ILIKE '%' || clean_term || '%'
                   OR username ILIKE '%' || clean_term || '%'
                ORDER BY created_at DESC
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 10] Danh sách người dùng
        'users', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT username, full_name, role, is_blocked, block_reason
                FROM public.users
                WHERE full_name ILIKE '%' || clean_term || '%'
                   OR username ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 11] Tương tác gần đây (Tin nhắn + Nhật ký)
        'interactions', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT category, type, message, actor_name, recipient, 
                       target_view, target_id, created_at
                FROM public.interactions
                WHERE message ILIKE '%' || clean_term || '%'
                   OR actor_name ILIKE '%' || clean_term || '%'
                   OR target_id ILIKE '%' || clean_term || '%'
                ORDER BY created_at DESC
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 12] Tri thức AI
        'ai_knowledge_base', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT category, lesson_key, content, importance
                FROM public.ai_knowledge_base
                WHERE content ILIKE '%' || clean_term || '%'
                   OR category ILIKE '%' || clean_term || '%'
                ORDER BY importance DESC
                LIMIT 5
            ) t
        ),
        
        -- [BẢNG 13] Đơn hàng tồn
        'donhang_ton', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT dt.so_don_hang, dt.tvbh_name, dt.ghi_chu, dt.status
                FROM public.donhang_ton dt
                WHERE dt.so_don_hang ILIKE '%' || clean_term || '%'
                   OR dt.tvbh_name ILIKE '%' || clean_term || '%'
                LIMIT 10
            ) t
        ),
        
        -- [BẢNG 14] Email TVBH
        'tvbh_emails', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT ten_tvbh, email
                FROM public.tvbh_emails
                WHERE ten_tvbh ILIKE '%' || clean_term || '%'
                   OR email ILIKE '%' || clean_term || '%'
                LIMIT 5
            ) t
        ),

        -- [BẢNG 15] Điều chỉnh uy tín
        'reputation_adjustments', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT username, adjustment_value, system_score_at_update, 
                       target_score, reason, updated_by
                FROM public.reputation_adjustments
                WHERE username ILIKE '%' || clean_term || '%'
                   OR reason ILIKE '%' || clean_term || '%'
                LIMIT 5
            ) t
        )
    ) INTO results;

    RETURN results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ai_global_search IS 
'Hàm thám tử AI v2.0: Tìm kiếm thông minh trên 15 bảng dữ liệu. 
Tự động nhận dạng loại tìm kiếm (VIN/Số đơn/Tên người). 
Luôn có LIMIT để không gây tải CPU.';

-- Phân quyền
GRANT EXECUTE ON FUNCTION public.ai_global_search(TEXT) TO anon, authenticated, service_role;


-- =============================================
-- 2. HÀM TỔNG HỢP: ai_full_context
-- Gom TOÀN BỘ dữ liệu cần thiết trong MỘT lệnh duy nhất
-- Thay thế 5+ lệnh SELECT riêng lẻ từ Client → Giảm 80% roundtrip
-- =============================================
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
                'pending_inquiries', (SELECT count(*) FROM public.car_inquiries WHERE status = 'pending'),
                'active_users', (SELECT count(*) FROM public.user_presence WHERE last_active_at > NOW() - INTERVAL '30 minutes')
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

COMMENT ON FUNCTION public.ai_full_context IS 
'Gom toàn bộ dữ liệu dashboard cho AI trong 1 lệnh. 
Thay thế nhiều lệnh SELECT riêng lẻ, giảm 80% network roundtrip.';

GRANT EXECUTE ON FUNCTION public.ai_full_context() TO anon, authenticated, service_role;
