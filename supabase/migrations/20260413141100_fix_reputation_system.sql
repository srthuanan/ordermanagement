-- Migration: Fix Reputation System and Add Auto-Trigger
-- Created: 2026-04-13 21:11

-- 1. Cập nhật lại hàm tính điểm để chính xác hơn
CREATE OR REPLACE FUNCTION public.calculate_user_reputation(p_username TEXT)
RETURNS TABLE (
    score INTEGER,
    total_holds INTEGER,
    matched_holds INTEGER,
    is_champion BOOLEAN
) AS $$
DECLARE
    v_score INTEGER := 100;
    v_total INTEGER := 0;
    v_matched INTEGER := 0;
    v_is_champion BOOLEAN := FALSE;
    v_start_of_month TIMESTAMPTZ := date_trunc('month', NOW());
    v_last_month_str TEXT := 'CHAMPION_' || to_char(NOW() - INTERVAL '1 month', 'YYYY-MM');
    v_champion_username TEXT;
    v_adjustment INTEGER := 0;
    r RECORD;
    v_vin_history JSONB := '{}'::jsonb;
    v_release_count INTEGER := 0;
BEGIN
    -- Lấy danh hiệu Quán quân
    SELECT reason INTO v_champion_username FROM public.reputation_adjustments WHERE username = v_last_month_str;
    IF v_champion_username = p_username THEN v_is_champion := TRUE; END IF;

    -- Lấy điều chỉnh từ Admin
    SELECT COALESCE(SUM(adjustment_value), 0) INTO v_adjustment 
    FROM public.reputation_adjustments 
    WHERE username = p_username AND updated_at >= v_start_of_month;

    -- Vòng lặp tính toán từ hoạt động
    FOR r IN (
        SELECT vin, status, created_at, updated_at, type
        FROM public.car_hold_activities
        WHERE username = p_username 
        AND created_at >= v_start_of_month
        AND type IN ('HOLD', 'PENALTY', 'BONUS')
        ORDER BY created_at ASC
    ) LOOP
        IF r.type = 'HOLD' THEN v_total := v_total + 1; END IF;
        
        DECLARE
            v_actual_updated TIMESTAMPTZ := COALESCE(r.updated_at, r.created_at);
            v_duration_hours NUMERIC;
            v_sunday_count INTEGER;
        BEGIN
            -- Trừ ngày Chủ Nhật (Sunday = 0)
            SELECT count(*)::int INTO v_sunday_count 
            FROM generate_series(r.created_at, v_actual_updated, '1 day'::interval) s
            WHERE EXTRACT(DOW FROM s) = 0;
            
            v_duration_hours := (EXTRACT(EPOCH FROM (v_actual_updated - r.created_at)) / 3600) - (v_sunday_count * 24);
            IF v_duration_hours < 0 THEN v_duration_hours := 0; END IF;

            -- Logic Điểm (+2/-4)
            IF r.status IN ('matched', 'invoiced') THEN
                v_matched := v_matched + 1;
                v_score := v_score + 2;
                IF r.status = 'invoiced' THEN v_score := v_score + 2; END IF;
            ELSIF r.status = 'expired' THEN
                v_score := v_score - 4;
                v_release_count := v_release_count + 1;
            ELSIF r.status = 'order_cancelled' THEN
                v_score := v_score - 4;
            ELSIF r.status = 'released' THEN
                v_release_count := v_release_count + 1;
                IF v_duration_hours >= 12 THEN v_score := v_score - 4; END IF;
            ELSIF r.status = 'lethargic_penalty' THEN
                v_score := v_score - 4;
            ELSIF r.status = 'supplement_requested' THEN v_score := v_score - 1;
            ELSIF r.status = 'vc_rejected' THEN v_score := v_score - 1;
            END IF;
        END;

        -- Phạt giữ lại cùng VIN
        IF r.type = 'HOLD' THEN
            IF (v_vin_history->>r.vin) IS NOT NULL THEN v_score := v_score - 4; END IF;
            v_vin_history := v_vin_history || jsonb_build_object(r.vin, 1);
        END IF;
    END LOOP;

    -- Phạt nhả xe quá nhiều (mỗi 5 lần nhả xe tính cả hết hạn)
    v_score := v_score - (floor(v_release_count / 5) * 2);
    
    -- Áp dụng Admin Adjustment
    v_score := v_score + v_adjustment;
    
    -- Khóa điểm trong phạm vi [0, 100]
    IF v_score < 0 THEN v_score := 0; END IF;
    IF v_score > 100 THEN v_score := 100; END IF;

    RETURN QUERY SELECT v_score, v_total, v_matched, v_is_champion;
END;
$$ LANGUAGE plpgsql;

-- 2. TẠO TRIGGER ĐỂ TÍNH ĐIỂM NGAY KHI CÓ HOẠT ĐỘNG
CREATE OR REPLACE FUNCTION public.trig_refresh_reputation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.refresh_user_reputation(NEW.username);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_activity_reputation_change ON public.car_hold_activities;
CREATE TRIGGER on_activity_reputation_change
AFTER INSERT OR UPDATE ON public.car_hold_activities
FOR EACH ROW EXECUTE FUNCTION public.trig_refresh_reputation();

-- 3. CHẠY LẠI CHO TOÀN BỘ USER ĐỂ CẬP NHẬT ĐIỂM MỚI
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN (SELECT username FROM public.users) LOOP
        PERFORM public.refresh_user_reputation(u.username);
    END LOOP;
END;
$$;
