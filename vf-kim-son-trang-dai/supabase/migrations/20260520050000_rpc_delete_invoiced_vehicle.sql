-- RPC xóa xe đã xuất hóa đơn khỏi khoxe (dành cho Bookmarklet dọn kho)
-- Sử dụng cùng cơ chế bảo mật token như get_vehicle_gps_targets và sync_vehicle_gps
CREATE OR REPLACE FUNCTION public.delete_invoiced_vehicle(
    p_token TEXT,
    p_vin   TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền Superuser để bypass RLS
AS $$
DECLARE
    v_vin       TEXT;
    v_deleted   INT;
BEGIN
    -- Kiểm tra bảo mật token (giống get_vehicle_gps_targets)
    IF p_token != 'KIMSON_VEHICLE_GPS_SYNC_20260514' THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    v_vin := upper(trim(p_vin));

    IF v_vin IS NULL OR length(v_vin) < 11 THEN
        RAISE EXCEPTION 'VIN không hợp lệ: %', p_vin;
    END IF;

    -- Xóa khỏi khoxe
    DELETE FROM public.khoxe WHERE vin = v_vin;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- Xóa luôn dữ liệu GPS liên quan (nếu có)
    DELETE FROM public.vehicle_locations WHERE vin = v_vin;

    RETURN jsonb_build_object(
        'success', true,
        'vin',     v_vin,
        'deleted', v_deleted
    );
END;
$$;

-- Cấp quyền thực thi cho anon (bookmark dùng publishable key = anon role)
GRANT EXECUTE ON FUNCTION public.delete_invoiced_vehicle(TEXT, TEXT) TO anon, authenticated;
