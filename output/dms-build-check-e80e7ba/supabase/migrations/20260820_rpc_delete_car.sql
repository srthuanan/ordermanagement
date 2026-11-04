-- Migration: Thêm RPC rpc_delete_car hỗ trợ xóa xe an toàn và nguyên tử (SECURITY DEFINER)
-- File: supabase/migrations/20260820_rpc_delete_car.sql

CREATE OR REPLACE FUNCTION public.rpc_delete_car(
    p_vin TEXT,
    p_reason TEXT DEFAULT '',
    p_actor_email TEXT DEFAULT '',
    p_actor_name TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
    v_clean_vin TEXT := upper(trim(p_vin));
    v_car_snap RECORD;
    v_unmatched_orders TEXT[] := ARRAY[]::TEXT[];
    r RECORD;
    v_gps_cache JSONB;
BEGIN
    IF v_clean_vin IS NULL OR v_clean_vin = '' THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Số VIN không được để trống.');
    END IF;

    -- 1. Tìm bản ghi xe trong khoxe (Hỗ trợ tìm chính xác hoặc Upper/Trim)
    SELECT * INTO v_car_snap 
    FROM public.khoxe 
    WHERE upper(trim(vin)) = v_clean_vin 
    LIMIT 1;

    IF v_car_snap IS NULL THEN
        -- Thử tìm qua ILIKE
        SELECT * INTO v_car_snap 
        FROM public.khoxe 
        WHERE vin ILIKE v_clean_vin 
        LIMIT 1;
    END IF;

    IF v_car_snap IS NULL THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy xe có số VIN ' || v_clean_vin || ' trong Kho Xe.');
    END IF;

    -- 2. Tự động hủy ghép các đơn hàng đang giữ hoặc ghép với VIN này
    FOR r IN (
        SELECT so_don_hang 
        FROM public.donhang 
        WHERE upper(trim(vin)) = v_clean_vin
    ) LOOP
        UPDATE public.donhang 
        SET ket_qua = 'Chưa ghép', 
            vin = NULL, 
            thoi_gian_ghep = NULL 
        WHERE so_don_hang = r.so_don_hang;
        
        v_unmatched_orders := array_append(v_unmatched_orders, r.so_don_hang);
    END LOOP;

    -- 3. Dọn dẹp hàng đợi giữ xe & hoạt động giữ xe liên quan (Kiểm tra an toàn nếu bảng tồn tại)
    BEGIN
        IF to_regclass('public.hold_queue') IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.hold_queue WHERE upper(trim(vin)) = ' || quote_literal(v_clean_vin);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        IF to_regclass('public.car_hold_activities') IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.car_hold_activities WHERE upper(trim(vin)) = ' || quote_literal(v_clean_vin);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        IF to_regclass('public.car_telemetry') IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.car_telemetry WHERE upper(trim(vin)) = ' || quote_literal(v_clean_vin);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 4. Ghi nhận nhật ký tương tác / Interactions để hỗ trợ phục hồi xe (Restore)
    INSERT INTO public.interactions (
        category, type, actor_id, actor_name, target_id, target_view, message, metadata
    ) VALUES (
        'LOG', 
        'DELETE_CAR', 
        COALESCE(NULLIF(p_actor_email, ''), 'admin@system.com'), 
        COALESCE(NULLIF(p_actor_name, ''), 'Admin'), 
        v_clean_vin, 
        'stock',
        'Xóa xe khỏi kho: ' || v_clean_vin || CASE WHEN p_reason <> '' THEN ' (Lý do: ' || p_reason || ')' ELSE '' END,
        jsonb_build_object(
            'vin', v_clean_vin,
            'reason', p_reason,
            'snapshot', to_jsonb(v_car_snap),
            'unmatched_orders', v_unmatched_orders
        )
    );

    -- 5. Thực hiện xóa xe khỏi khoxe
    DELETE FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin;

    -- 6. Dọn dẹp bộ nhớ đệm GPS xe nếu có trong app_settings
    BEGIN
        IF to_regclass('public.app_settings') IS NOT NULL THEN
            SELECT value INTO v_gps_cache FROM public.app_settings WHERE key = 'car_gps_cache' LIMIT 1;
            IF v_gps_cache IS NOT NULL AND v_gps_cache ? v_clean_vin THEN
                v_gps_cache := v_gps_cache - v_clean_vin;
                UPDATE public.app_settings SET value = v_gps_cache, updated_at = NOW() WHERE key = 'car_gps_cache';
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'message', 'Đã xóa xe ' || v_clean_vin || ' khỏi kho thành công.' || 
                   CASE WHEN array_length(v_unmatched_orders, 1) > 0 
                        THEN ' (Đã tự động hủy ghép ' || array_to_string(v_unmatched_orders, ', ') || ')' 
                        ELSE '' END
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Lỗi Database khi xóa xe: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_delete_car IS 'Hàm RPC an toàn hỗ trợ Admin xóa xe khỏi kho, tự động snapshot và hủy ghép các đơn hàng liên quan.';
