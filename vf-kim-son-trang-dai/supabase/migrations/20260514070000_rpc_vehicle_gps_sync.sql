-- 1. Hàm RPC lấy danh sách xe (dành cho Bookmarklet)
CREATE OR REPLACE FUNCTION public.get_vehicle_gps_targets(
    p_token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền Superuser để vượt qua RLS
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Kiểm tra bảo mật token
    IF p_token != 'KIMSON_VEHICLE_GPS_SYNC_20260514' THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;
    
    SELECT jsonb_build_object(
        'success', true,
        'vehicles', COALESCE(jsonb_agg(t), '[]'::jsonb),
        'vins', COALESCE(jsonb_agg(t.vin), '[]'::jsonb)
    ) INTO v_result
    FROM (
        SELECT
            k.vin,
            COALESCE(NULLIF(TRIM(ttx.mo_ta), ''), k.dong_xe) AS dong_xe,
            COALESCE(NULLIF(TRIM(ttx.phien_ban), ''), k.phien_ban) AS phien_ban,
            COALESCE(NULLIF(TRIM(ttx.ngoai_that), ''), k.ngoai_that) AS ngoai_that,
            COALESCE(NULLIF(TRIM(ttx.noi_that), ''), k.noi_that) AS noi_that,
            COALESCE(NULLIF(TRIM(ttx.so_may), ''), k.so_may) AS so_may,
            COALESCE(NULLIF(TRIM(ttx.khu_vuc), ''), k.ma_dms) AS ma_dms,
            k.trang_thai,
            k.nguoi_giu_xe,
            k.vi_tri
        FROM public.khoxe k
        LEFT JOIN public.thongtinxe ttx ON ttx.vin = k.vin
        ORDER BY k.ngay_nhap ASC
    ) t;
    
    RETURN v_result;
END;
$$;

-- Cấp quyền thực thi cho role anon và authenticated
GRANT EXECUTE ON FUNCTION public.get_vehicle_gps_targets(TEXT) TO anon, authenticated;


-- 2. Hàm RPC đồng bộ tọa độ xe (dành cho Bookmarklet)
CREATE OR REPLACE FUNCTION public.sync_vehicle_gps(
    p_token TEXT,
    p_vin TEXT,
    p_latitude NUMERIC,
    p_longitude NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền Superuser để ghi đè RLS
AS $$
DECLARE
    v_vin TEXT;
    v_now TIMESTAMPTZ;
BEGIN
    -- Kiểm tra bảo mật token
    IF p_token != 'KIMSON_VEHICLE_GPS_SYNC_20260514' THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    v_vin := upper(trim(p_vin));
    v_now := now();

    IF v_vin IS NULL OR length(v_vin) < 11 THEN
        RAISE EXCEPTION 'VIN không hợp lệ';
    END IF;

    IF p_latitude IS NULL OR p_longitude IS NULL THEN
        RAISE EXCEPTION 'Tọa độ không hợp lệ';
    END IF;
    
    -- Cập nhật bảng khoxe
    UPDATE public.khoxe
    SET vi_tri = 'GPS LIVE',
        latitude = p_latitude,
        longitude = p_longitude,
        updated_at = v_now
    WHERE vin = v_vin;
    
    -- Ghi vào bảng vehicle_locations
    INSERT INTO public.vehicle_locations (vin, vi_tri, latitude, longitude, updated_at)
    VALUES (v_vin, 'GPS LIVE', p_latitude, p_longitude, v_now)
    ON CONFLICT (vin) DO UPDATE
    SET vi_tri = EXCLUDED.vi_tri,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = EXCLUDED.updated_at;
        
    RETURN jsonb_build_object(
        'success', true,
        'vin', v_vin,
        'latitude', p_latitude,
        'longitude', p_longitude
    );
END;
$$;

-- Cấp quyền thực thi cho role anon và authenticated
GRANT EXECUTE ON FUNCTION public.sync_vehicle_gps(TEXT, TEXT, NUMERIC, NUMERIC) TO anon, authenticated;
