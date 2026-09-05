-- Migration: Integrate Storage Temp Scans Cleanup into Master Auto-Cleanup RPC
CREATE OR REPLACE FUNCTION public.auto_cleanup_system()
RETURNS JSON AS $$
DECLARE
    v_released_count INTEGER := 0;
    v_promoted_count INTEGER := 0;
    v_cleaned_prio_count INTEGER := 0;
    v_deleted_temp_files INTEGER := 0;
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
        AND (to_timestamp(thoi_gian_het_han_giu, 'DD/MM/YYYY HH24:MI:SS')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') < NOW()
    ) LOOP
        PERFORM public.rpc_release_car(r.vin, 'expired');
        v_released_count := v_released_count + 1;
    END LOOP;

    -- 2. XỬ LÝ HÀNG CHỜ BỊ KẸT
    FOR v_vin IN (
        SELECT DISTINCT vin 
        FROM public.car_hold_activities 
        WHERE type = 'QUEUE' AND status IN ('waiting', 'notified')
    ) LOOP
        IF EXISTS (SELECT 1 FROM public.khoxe WHERE vin = v_vin AND trang_thai = 'Chưa ghép') THEN
            IF NOT EXISTS (SELECT 1 FROM public.car_hold_activities WHERE vin = v_vin AND status = 'prioritized') THEN
                PERFORM public.rpc_release_car(v_vin, 'released');
                v_promoted_count := v_promoted_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- 3. DỌN DẸP ƯU TIÊN HẾT HẠN
    FOR r IN (
        SELECT id, vin 
        FROM public.car_hold_activities 
        WHERE type = 'QUEUE' AND status = 'prioritized' 
        AND updated_at < (NOW() - INTERVAL '15 minutes')
    ) LOOP
        DELETE FROM public.car_hold_activities WHERE id = r.id;
        PERFORM public.rpc_release_car(r.vin, 'expired');
        v_cleaned_prio_count := v_cleaned_prio_count + 1;
    END LOOP;

    -- 4. DỌN DẸP TOÀN BỘ FILE RÁC TRONG BUCKET TEMP_SCANS QUÁ 2 TIẾNG
    BEGIN
        DELETE FROM storage.objects
        WHERE bucket_id = 'temp_scans'
          AND created_at < (NOW() - INTERVAL '2 hours');
        GET DIAGNOSTICS v_deleted_temp_files = ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            v_deleted_temp_files := 0;
    END;

    RETURN json_build_object(
        'status', 'SUCCESS',
        'released_expired', v_released_count,
        'promoted_stuck_queue', v_promoted_count,
        'cleaned_prio_queue', v_cleaned_prio_count,
        'deleted_temp_files', v_deleted_temp_files
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
