-- Migration: Master Cleanup System for Auto-Release and Queue Activation
-- Date: 2026-03-15

CREATE OR REPLACE FUNCTION public.auto_cleanup_system()
RETURNS JSON AS $$
DECLARE
    v_released_count INTEGER := 0;
    v_promoted_count INTEGER := 0;
    v_cleaned_prio_count INTEGER := 0;
    r RECORD;
    v_vin TEXT;
BEGIN
    -- 1. GIẢI PHÓNG XE HẾT HẠN (24h giữ xe)
    FOR r IN (
        SELECT vin 
        FROM public.khoxe 
        WHERE trang_thai = 'Đang giữ' 
        AND thoi_gian_het_han_giu IS NOT NULL 
        AND thoi_gian_het_han_giu <> 'Vô thời hạn'
        -- Parse định dạng DD/MM/YYYY HH24:MI:SS
        AND to_timestamp(thoi_gian_het_han_giu, 'DD/MM/YYYY HH24:MI:SS') < NOW()
    ) LOOP
        PERFORM public.rpc_release_car(r.vin, 'expired');
        v_released_count := v_released_count + 1;
    END LOOP;

    -- 2. XỬ LÝ HÀNG CHỜ BỊ KẸT (Xe rảnh nhưng không có ai được prioritized)
    FOR v_vin IN (
        SELECT DISTINCT vin 
        FROM public.car_hold_activities 
        WHERE type = 'QUEUE' AND status IN ('waiting', 'notified')
    ) LOOP
        -- Nếu xe đang thực sự rảnh
        IF EXISTS (SELECT 1 FROM public.khoxe WHERE vin = v_vin AND trang_thai = 'Chưa ghép') THEN
            -- Và chưa có ai đang được trong 15p ưu tiên
            IF NOT EXISTS (SELECT 1 FROM public.car_hold_activities WHERE vin = v_vin AND status = 'prioritized') THEN
                -- Kích hoạt đôn người ngay lập tức
                PERFORM public.rpc_release_car(v_vin, 'released');
                v_promoted_count := v_promoted_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- 3. DỌN DẸP ƯU TIÊN HẾT HẠN (Quá 15p ưu tiên mà không bấm giữ)
    FOR r IN (
        SELECT id, vin 
        FROM public.car_hold_activities 
        WHERE type = 'QUEUE' AND status = 'prioritized' 
        AND updated_at < (NOW() - INTERVAL '15 minutes')
    ) LOOP
        DELETE FROM public.car_hold_activities WHERE id = r.id;
        -- Đôn người xếp hàng tiếp theo lên
        PERFORM public.rpc_release_car(r.vin, 'expired');
        v_cleaned_prio_count := v_cleaned_prio_count + 1;
    END LOOP;

    RETURN json_build_object(
        'status', 'SUCCESS',
        'released_expired', v_released_count,
        'promoted_stuck_queue', v_promoted_count,
        'cleaned_expired_prio', v_cleaned_prio_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
