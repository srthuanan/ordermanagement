-- =============================================================
-- Migration: NÂO BỘ AI PHIÊN BẢN 3.1 - Sửa lỗi Crash (Safety First)
-- Ngày: 2026-04-15
-- =============================================================

CREATE OR REPLACE FUNCTION public.ai_global_search(search_term TEXT)
RETURNS JSON AS $$
DECLARE
    results JSON;
    clean_term TEXT;
BEGIN
    -- Chuẩn hóa từ khóa
    clean_term := TRIM(search_term);

    SELECT json_build_object(
        'search_summary', json_build_object(
            'term', clean_term
        ),
        
        -- [BẢNG 1] Đơn hàng
        'donhang', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT so_don_hang, ten_khach_hang, ket_qua, vin, dong_xe, phien_ban,
                       ngoai_that, ten_tu_van_ban_hang as tvbh, thoi_gian_nhap, ngay_coc,
                       ngay_xuat_hoa_don, ma_dms, so_may
                FROM public.donhang
                WHERE vin ILIKE '%' || clean_term || '%'
                   OR so_don_hang ILIKE '%' || clean_term || '%'
                   OR ten_khach_hang ILIKE '%' || clean_term || '%'
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
                WHERE vin ILIKE '%' || clean_term || '%'
                   OR (
                       dong_xe ILIKE '%' || clean_term || '%'
                       OR phien_ban ILIKE '%' || clean_term || '%'
                       OR ngoai_that ILIKE '%' || clean_term || '%'
                   )
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
                   OR vin ILIKE '%' || clean_term || '%'
                LIMIT 15
            ) t
        )
    ) INTO results;

    RETURN results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ai_global_search(TEXT) TO anon, authenticated, service_role;
