-- Migration: Tạo hàm tổng kết kho xe chuẩn xác cho AI
-- Mục đích: Giúp AI báo cáo số liệu kho xe khớp 100% với thực tế mà không gây nặng máy.

CREATE OR REPLACE FUNCTION public.get_ai_stock_summary()
RETURNS TABLE (dong_xe text, so_luong bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(k.dong_xe, 'Khác') as dong_xe,
        count(*) as so_luong
    FROM public.khoxe k
    GROUP BY k.dong_xe
    ORDER BY so_luong DESC;
END;
$$;

COMMENT ON FUNCTION public.get_ai_stock_summary IS 'Hàm trả về bảng tổng kết kho xe thực tế cho Trợ lý ảo AI.';
