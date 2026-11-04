-- Migration: Rebalance Reputation and Permanent Lethargic Penalty (Smaller points)
-- Date: 2026-03-17

-- 1. Update Reputation Calculation Logic
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
    -- Get Champion
    SELECT reason INTO v_champion_username FROM public.reputation_adjustments WHERE username = v_last_month_str;
    IF v_champion_username = p_username THEN
        v_is_champion := TRUE;
    END IF;

    -- Get adjustment from Admin
    SELECT adjustment_value INTO v_adjustment 
    FROM public.reputation_adjustments 
    WHERE username = p_username AND updated_at >= v_start_of_month;

    -- Calculate base score and counts from activities
    FOR r IN (
        SELECT vin, status, created_at, updated_at, type, reason
        FROM public.car_hold_activities
        WHERE username = p_username 
        AND created_at >= v_start_of_month
        AND type IN ('HOLD', 'PENALTY', 'BONUS')
    ) LOOP
        -- Tổng số lệnh giữ xe trong tháng
        IF r.type = 'HOLD' THEN
            v_total := v_total + 1;
        END IF;
        
        DECLARE
            v_actual_updated TIMESTAMPTZ := COALESCE(r.updated_at, r.created_at);
            v_duration_hours NUMERIC;
            v_sunday_count INTEGER;
        BEGIN
            -- Đếm số ngày Chủ Nhật nằm trong khoảng [created_at, actual_updated]
            SELECT count(*)::int INTO v_sunday_count 
            FROM generate_series(r.created_at, v_actual_updated, '1 day'::interval) s
            WHERE EXTRACT(DOW FROM s) = 0;
            
            v_duration_hours := (EXTRACT(EPOCH FROM (v_actual_updated - r.created_at)) / 3600) - (v_sunday_count * 24);
            IF v_duration_hours < 0 THEN v_duration_hours := 0; END IF;

            -- Balanced Score Logic (+4/-4)
            IF r.status IN ('matched', 'invoiced') THEN
                v_matched := v_matched + 1;
                v_score := v_score + 2; -- Match +2
                IF r.status = 'invoiced' THEN v_score := v_score + 2; END IF; -- Invoiced +2
            ELSIF r.status = 'expired' THEN
                v_score := v_score - 4; -- Để hết hạn -4
                v_release_count := v_release_count + 1;
            ELSIF r.status = 'order_cancelled' THEN
                v_score := v_score - 4; -- Hủy đơn -4
            ELSIF r.status = 'released' THEN
                v_release_count := v_release_count + 1;
                -- Phạt nhả xe chậm
                IF v_duration_hours >= 12 THEN
                    v_score := v_score - 4;
                END IF;
            ELSIF r.status = 'lethargic_penalty' THEN
                v_score := v_score - 4; -- Ngâm đơn -4 (Vĩnh viễn)
            ELSIF r.status = 'supplement_requested' THEN v_score := v_score - 1;
            ELSIF r.status = 'vc_rejected' THEN v_score := v_score - 1;
            END IF;
        END;

        -- Phạt giữ lại cùng 1 xe
        IF r.type = 'HOLD' THEN
            IF (v_vin_history->>r.vin) IS NOT NULL THEN
                v_score := v_score - 4;
            END IF;
            v_vin_history := v_vin_history || jsonb_build_object(r.vin, 1);
        END IF;
    END LOOP;

    -- Spam nhả xe penalty (Mỗi 5 lần nhả thì phạt 2 điểm)
    v_score := v_score - (floor(v_release_count / 5) * 2);
    
    -- Applying adjustment
    v_score := v_score + COALESCE(v_adjustment, 0);
    
    -- Cap score
    IF v_score < 0 THEN v_score := 0; END IF;
    IF v_score > 100 THEN v_score := 100; END IF;

    RETURN QUERY SELECT v_score, v_total, v_matched, v_is_champion;
END;
$$ LANGUAGE plpgsql;

-- 2. Update Refresh Procedure to handle Lethargic Penalties permanently
CREATE OR REPLACE FUNCTION public.refresh_user_reputation(p_username TEXT)
RETURNS void AS $$
BEGIN
    -- [PHẠT NGÂM ĐƠN VĨNH VIỄN]
    INSERT INTO public.car_hold_activities (vin, username, tvbh_name, status, type, reason, created_at)
    SELECT vin, ten_tu_van_ban_hang, ten_tu_van_ban_hang, 'lethargic_penalty', 'PENALTY', 'Ngâm đơn quá lâu (>5 ngày)', NOW()
    FROM public.donhang
    WHERE ten_tu_van_ban_hang = p_username
    AND ket_qua = 'Đã ghép' 
    AND (thoi_gian_ghep::timestamptz) <= (NOW() - INTERVAL '5 days')
    AND NOT EXISTS (
        SELECT 1 FROM public.car_hold_activities 
        WHERE vin = public.donhang.vin 
        AND username = p_username 
        AND status = 'lethargic_penalty'
        AND created_at >= date_trunc('month', NOW())
    );

    -- Cập nhật Cache
    INSERT INTO public.user_reputation_cache (username, score, total_holds, matched_holds, is_champion, last_updated)
    SELECT p_username, score, total_holds, matched_holds, is_champion, NOW()
    FROM public.calculate_user_reputation(p_username)
    ON CONFLICT (username) DO UPDATE SET
        score = EXCLUDED.score,
        total_holds = EXCLUDED.total_holds,
        matched_holds = EXCLUDED.matched_holds,
        is_champion = EXCLUDED.is_champion,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;
