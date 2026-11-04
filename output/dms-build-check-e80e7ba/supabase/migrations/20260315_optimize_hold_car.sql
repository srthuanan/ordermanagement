-- Migration: Optimize Hold Car Functionality with RPC and Caching
-- Date: 2026-03-15

-- 1. Create Reputation Cache Table
CREATE TABLE IF NOT EXISTS public.user_reputation_cache (
    username TEXT PRIMARY KEY,
    score INTEGER DEFAULT 100,
    total_holds INTEGER DEFAULT 0,
    matched_holds INTEGER DEFAULT 0,
    is_champion BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Function to Calculate Reputation for a User
-- Ported from apiService.ts getHoldReputation
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
    v_lethargic_count INTEGER := 0;
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

    -- Calculate base score and counts from current month activities
    FOR r IN (
        SELECT vin, status, created_at, updated_at, type, reason
        FROM public.car_hold_activities
        WHERE username = p_username 
        AND created_at >= v_start_of_month
        AND type IN ('HOLD', 'PENALTY', 'BONUS')
    ) LOOP
        v_total := v_total + 1;
        
        -- Tính thời gian giữ thực tế (Trừ đi các ngày Chủ Nhật nếu có)
        -- Dùng logic: Nếu khoảng thời gian có chứa Chủ Nhật, trừ đi 24h cho mỗi ngày CN
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

            -- Score Logic
            IF r.status IN ('matched', 'invoiced') THEN
                v_matched := v_matched + 1;
                v_score := v_score + 8;
                IF r.status = 'invoiced' THEN v_score := v_score + 4; END IF;
                -- Thưởng giữ xe nhanh (dưới 6 tiếng làm việc)
                IF v_duration_hours <= 6 THEN
                    v_score := v_score + 4;
                END IF;
            ELSIF r.status = 'expired' THEN
                v_score := v_score - 5;
                v_release_count := v_release_count + 1;
            ELSIF r.status = 'order_cancelled' THEN
                IF r.reason LIKE '%Khách hàng hủy cọc%' THEN
                    v_score := v_score - 4;
                ELSE
                    v_score := v_score - 2;
                END IF;
            ELSIF r.status = 'released' THEN
                v_release_count := v_release_count + 1;
                -- Phạt dựa trên thời gian chiếm dụng (Đã trừ Chủ Nhật)
                IF v_duration_hours >= 18 THEN
                    v_score := v_score - 4;
                ELSIF v_duration_hours >= 12 THEN
                    v_score := v_score - 3;
                END IF;
            ELSIF r.status = 'supplement_requested' THEN v_score := v_score - 2;
            ELSIF r.status = 'vc_rejected' THEN v_score := v_score - 2;
            ELSIF r.status = 'extension_requested' THEN v_score := v_score - 1;
            ELSIF r.status = 'extension_rejected' THEN v_score := v_score - 3;
            END IF;
        END;

        -- Re-hold penalty
        IF (v_vin_history->>r.vin) IS NOT NULL THEN
            v_score := v_score - 4;
        END IF;
        v_vin_history := v_vin_history || jsonb_build_object(r.vin, 1);
    END LOOP;

    -- Spam nhả xe penalty
    v_score := v_score - (floor(v_release_count / 5) * 2);

    -- Lethargic orders (> 5 days matched but not invoiced)
    SELECT count(*) INTO v_lethargic_count
    FROM public.donhang
    WHERE ten_tu_van_ban_hang = p_username
    AND ket_qua = 'Đã ghép'
    AND thoi_gian_ghep <= (NOW() - INTERVAL '5 days');

    v_score := v_score - (v_lethargic_count * 3);
    
    -- Applying adjustment
    v_score := v_score + COALESCE(v_adjustment, 0);
    
    -- Cap score
    IF v_score < 0 THEN v_score := 0; END IF;
    IF v_score > 100 THEN v_score := 100; END IF;

    RETURN QUERY SELECT v_score, v_total, v_matched, v_is_champion;
END;
$$ LANGUAGE plpgsql;

-- 3. Procedure to refresh reputation cache
CREATE OR REPLACE FUNCTION public.refresh_user_reputation(p_username TEXT)
RETURNS void AS $$
BEGIN
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

-- 4. RPC: rpc_hold_car
-- The core logic to hold a car faster
CREATE OR REPLACE FUNCTION public.rpc_hold_car(p_vin TEXT, p_username TEXT, p_full_name TEXT)
RETURNS JSON AS $$
DECLARE
    v_car_status TEXT;
    v_current_count INTEGER;
    v_reputation_score INTEGER;
    v_reputation_total INTEGER;
    v_is_champion BOOLEAN;
    v_max_holds INTEGER;
    v_rank_name TEXT;
    v_recent_release_diff_hours NUMERIC;
    v_global_cooldown_minutes NUMERIC;
    v_spam_count INTEGER;
    v_priority_user TEXT;
    v_priority_expiry TIMESTAMPTZ;
    v_past_hold_count INTEGER;
    v_hold_hours INTEGER := 24;
    v_hold_exp_str TEXT;
    v_hold_exp_date TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_result JSON;
BEGIN
    -- 0. Check car existence and status
    SELECT trang_thai INTO v_car_status FROM public.khoxe WHERE vin = p_vin;
    IF v_car_status IS NULL THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy thông tin xe trong hệ thống.');
    END IF;
    IF v_car_status <> 'Chưa ghép' THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không thể giữ xe. Trạng thái hiện tại: ' || v_car_status);
    END IF;

    -- 1. Get Reputation and Rank from Cache (Refreshed by trigger asynchronously)
    SELECT score, total_holds, is_champion INTO v_reputation_score, v_reputation_total, v_is_champion 
    FROM public.user_reputation_cache WHERE username = p_username;
    
    -- If user not in cache yet, do a quick refresh once
    IF v_reputation_score IS NULL THEN
        PERFORM public.refresh_user_reputation(p_username);
        SELECT score, total_holds, is_champion INTO v_reputation_score, v_reputation_total, v_is_champion 
        FROM public.user_reputation_cache WHERE username = p_username;
    END IF;

    -- Logic rank
    IF v_reputation_score >= 85 THEN v_max_holds := 5; v_rank_name := 'Tinh Anh (Hạng S)';
    ELSIF v_reputation_score >= 65 THEN v_max_holds := 4; v_rank_name := 'Chuyên nghiệp (Hạng A)';
    ELSIF v_reputation_score >= 40 THEN v_max_holds := 3; v_rank_name := 'Tiêu chuẩn (Hạng B)';
    ELSIF v_reputation_score >= 15 THEN v_max_holds := 2; v_rank_name := 'Cơ bản (Hạng C)';
    ELSIF v_reputation_score > 0 THEN v_max_holds := 1; v_rank_name := 'Thử thách (Hạng D)';
    ELSE v_max_holds := 0; v_rank_name := 'Bị khóa';
    END IF;

    IF v_is_champion AND v_max_holds > 0 THEN
        v_max_holds := v_max_holds + 1;
        v_rank_name := v_rank_name || ' + Thưởng Quán Quân';
    END IF;

    -- Check current holds from khoxe
    SELECT count(*) INTO v_current_count FROM public.khoxe WHERE username_giu_xe = p_username AND trang_thai = 'Đang giữ';

    IF v_current_count >= v_max_holds THEN
        IF v_max_holds = 0 THEN
            RETURN json_build_object('status', 'ERROR', 'message', 'Tài khoản bị khóa chức năng giữ xe do uy tín quá thấp (' || v_reputation_score || '%).');
        ELSE
            RETURN json_build_object('status', 'ERROR', 'message', 'Giới hạn: Hạng ' || v_rank_name || ' chỉ được giữ tối đa ' || v_max_holds || ' xe. Bạn đang giữ ' || v_current_count || ' xe.');
        END IF;
    END IF;

    -- 2. Cooling-off (2 hours)
    SELECT EXTRACT(EPOCH FROM (v_now - updated_at)) / 3600 INTO v_recent_release_diff_hours
    FROM public.car_hold_activities
    WHERE vin = p_vin AND username = p_username AND type = 'HOLD' AND status IN ('released', 'expired')
    ORDER BY updated_at DESC LIMIT 1;

    IF v_recent_release_diff_hours IS NOT NULL AND v_recent_release_diff_hours < 2 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Bạn vừa giải phóng xe này. Vui lòng đợi ' || ceil((2 - v_recent_release_diff_hours) * 60) || ' phút nữa để giữ lại.');
    END IF;

    -- 3. Global Cooldown (15 mins after long hold)
    SELECT EXTRACT(EPOCH FROM (v_now - updated_at)) / 60 INTO v_global_cooldown_minutes
    FROM public.car_hold_activities
    WHERE vin = p_vin AND type = 'HOLD' AND status IN ('released', 'expired')
    AND EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 > 6
    ORDER BY updated_at DESC LIMIT 1;

    IF v_global_cooldown_minutes IS NOT NULL AND v_global_cooldown_minutes < 15 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Xe vừa giải phóng sau thời gian dài bị chiếm dụng. Hệ thống phong tỏa thêm ' || ceil(15 - v_global_cooldown_minutes) || ' phút để đảm bảo công bằng.');
    END IF;

    -- 4. Spam check (5 releases in 10 mins)
    SELECT count(*) INTO v_spam_count
    FROM public.car_hold_activities
    WHERE username = p_username AND type = 'HOLD' AND status IN ('released', 'expired')
    AND updated_at >= (v_now - INTERVAL '10 minutes');

    IF v_spam_count >= 5 THEN
        -- DB can't trigger frontend block event, but we can return special error for frontend to handle
        RETURN json_build_object('status', 'SPAM_BLOCK', 'message', 'Hành vi spam giữ-nhả (' || v_spam_count || ' lượt/10p). Hệ thống tạm ngắt kết nối để cảnh báo.');
    END IF;

    -- 5. Priority Check
    SELECT username, (updated_at + INTERVAL '15 minutes') INTO v_priority_user, v_priority_expiry
    FROM public.car_hold_activities
    WHERE vin = p_vin AND type = 'QUEUE' AND status = 'prioritized'
    ORDER BY updated_at DESC LIMIT 1;

    IF v_priority_user IS NOT NULL THEN
        IF v_now < v_priority_expiry THEN
            IF v_priority_user <> p_username THEN
                RETURN json_build_object('status', 'ERROR', 'message', 'Xe đang trong 15 phút ưu tiên dành riêng cho người khác.');
            ELSE
                -- Current user has priority, consume it
                DELETE FROM public.car_hold_activities WHERE vin = p_vin AND username = p_username AND type = 'QUEUE';
            END IF;
        ELSE
            -- Expired priority
            DELETE FROM public.car_hold_activities WHERE vin = p_vin AND username = v_priority_user AND type = 'QUEUE';
            -- Potentially next person logic omitted for simplicity in RPC, 
            -- but could be added if critical.
        END IF;
    END IF;

    -- 6. Anti-camping (hold count in 7 days)
    SELECT count(*) INTO v_past_hold_count
    FROM public.car_hold_activities
    WHERE vin = p_vin AND username = p_username AND type = 'HOLD' AND created_at >= (v_now - INTERVAL '7 days');

    IF v_past_hold_count = 1 THEN v_hold_hours := 12;
    ELSIF v_past_hold_count = 2 THEN v_hold_hours := 6;
    ELSIF v_past_hold_count >= 3 THEN v_hold_hours := 2;
    END IF;

    v_hold_exp_date := v_now + (v_hold_hours * INTERVAL '1 hour');
    
    -- KIỂM TRA CHỦ NHẬT: Nếu thời hạn đi xuyên qua ngày CN, cộng thêm 24 tiếng nghỉ
    IF EXISTS (
        SELECT 1 FROM generate_series(v_now, v_hold_exp_date, '1 hour'::interval) s
        WHERE EXTRACT(DOW FROM s) = 0
    ) THEN
        v_hold_exp_date := v_hold_exp_date + INTERVAL '24 hours';
    END IF;

    v_hold_exp_str := to_char(v_hold_exp_date, 'DD/MM/YYYY HH24:MI:SS');

    -- 7. Execute Hold
    UPDATE public.khoxe SET
        trang_thai = 'Đang giữ',
        nguoi_giu_xe = p_full_name,
        username_giu_xe = p_username,
        thoi_gian_het_han_giu = v_hold_exp_str,
        is_extension_requested = false,
        extension_count = 0
    WHERE vin = p_vin AND trang_thai = 'Chưa ghép';

    IF NOT FOUND THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không thể giữ xe. Trạng thái xe đã thay đổi.');
    END IF;

    -- Log Activity (Explicitly done here, trigger on khoxe will skip due to EXISTS check)
    INSERT INTO public.car_hold_activities (vin, username, tvbh_name, status, type, created_at, updated_at)
    VALUES (p_vin, p_username, p_full_name, 'active', 'HOLD', v_now, v_now);

    -- Note: Cache refresh is handled by trigger on car_hold_activities

    RETURN json_build_object(
        'status', 'SUCCESS', 
        'message', 'Đã giữ xe thành công' || CASE WHEN v_past_hold_count > 0 THEN ' (Lần giữ thứ ' || (v_past_hold_count+1) || ' trong 7 ngày, thời gian rút ngắn còn ' || v_hold_hours || 'h)' ELSE '' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.5 RPC: rpc_release_car
CREATE OR REPLACE FUNCTION public.rpc_release_car(p_vin TEXT, p_outcome TEXT DEFAULT 'released')
RETURNS JSON AS $$
DECLARE
    v_username TEXT;
    v_full_name TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_next_user RECORD;
    v_next_max_holds INTEGER;
    v_next_score INTEGER;
    v_next_current_holds INTEGER;
    v_found_next BOOLEAN := FALSE;
BEGIN
    -- 1. Get current holder info
    SELECT username_giu_xe, nguoi_giu_xe INTO v_username, v_full_name 
    FROM public.khoxe WHERE vin = p_vin;
    
    -- 2. Update car status
    UPDATE public.khoxe SET
        trang_thai = 'Chưa ghép',
        nguoi_giu_xe = null,
        username_giu_xe = null,
        thoi_gian_het_han_giu = null,
        is_extension_requested = false
    WHERE vin = p_vin;

    -- 3. Update activity status
    IF v_username IS NOT NULL THEN
        UPDATE public.car_hold_activities SET
            updated_at = v_now,
            status = p_outcome
        WHERE vin = p_vin AND username = v_username AND type = 'HOLD' AND status = 'active';
        
        -- Logging Interaction
        INSERT INTO public.interactions (category, type, message, actor_id, actor_name, target_view, target_id)
        VALUES ('LOG', 'INFO', 'Giải phóng xe (Trạng thái: ' || p_outcome || ')', v_username, v_full_name, 'stock', p_vin);
    END IF;

    -- 4. Handle Priority Queue (Waitlist)
    IF p_outcome <> 'matched' THEN
        FOR v_next_user IN (
            SELECT username, tvbh_name 
            FROM public.car_hold_activities 
            WHERE vin = p_vin AND type = 'QUEUE' AND status IN ('waiting', 'notified')
            ORDER BY created_at ASC
        ) LOOP
            -- Check if this user can hold another car (Reputation Check)
            SELECT score INTO v_next_score FROM public.user_reputation_cache WHERE username = v_next_user.username;
            IF v_next_score IS NULL THEN v_next_score := 100; END IF;
            
            IF v_next_score >= 85 THEN v_next_max_holds := 5;
            ELSIF v_next_score >= 65 THEN v_next_max_holds := 4;
            ELSIF v_next_score >= 40 THEN v_next_max_holds := 3;
            ELSIF v_next_score >= 15 THEN v_next_max_holds := 2;
            ELSIF v_next_score > 0 THEN v_next_max_holds := 1;
            ELSE v_next_max_holds := 0;
            END IF;
            
            -- Check current holds
            SELECT count(*) INTO v_next_current_holds FROM public.khoxe WHERE username_giu_xe = v_next_user.username AND trang_thai = 'Đang giữ';
            
            -- Check if already prioritized elsewhere
            IF v_next_current_holds < v_next_max_holds AND NOT EXISTS (
                SELECT 1 FROM public.car_hold_activities WHERE username = v_next_user.username AND status = 'prioritized'
            ) THEN
                -- Prioritize this user
                UPDATE public.car_hold_activities SET
                    status = 'prioritized',
                    updated_at = v_now
                WHERE vin = p_vin AND username = v_next_user.username AND type = 'QUEUE';
                
                -- Create System Notification in interactions table
                INSERT INTO public.interactions (category, message, type, recipient, target_view, target_id, actor_id, actor_name, created_at)
                VALUES (
                    'NOTIFICATION',
                    'Xe ' || p_vin || ' vừa được giải phóng. Bạn có 15 phút ưu tiên để giữ xe này!',
                    'success',
                    v_next_user.username,
                    'stock',
                    p_vin,
                    'System',
                    'System',
                    v_now
                );
                
                v_found_next := TRUE;
                EXIT; -- Only prioritize the first valid person
            END IF;
        END LOOP;
    ELSE
        -- If matched, clear all queue items for this VIN
        DELETE FROM public.car_hold_activities WHERE vin = p_vin AND type = 'QUEUE';
    END IF;

    RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã hủy giữ xe thành công');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger to refresh cache on activity change
CREATE OR REPLACE FUNCTION public.on_car_hold_activity_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        PERFORM public.refresh_user_reputation(NEW.username);
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.refresh_user_reputation(OLD.username);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_refresh_reputation_on_activity ON public.car_hold_activities;
CREATE TRIGGER tr_refresh_reputation_on_activity
AFTER INSERT OR UPDATE OR DELETE ON public.car_hold_activities
FOR EACH ROW EXECUTE FUNCTION public.on_car_hold_activity_change();

-- 6. Trigger on reputation_adjustments
CREATE OR REPLACE FUNCTION public.on_reputation_adjustment_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        PERFORM public.refresh_user_reputation(NEW.username);
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.refresh_user_reputation(OLD.username);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_refresh_reputation_on_adjustment ON public.reputation_adjustments;
CREATE TRIGGER tr_refresh_reputation_on_adjustment
AFTER INSERT OR UPDATE OR DELETE ON public.reputation_adjustments
FOR EACH ROW EXECUTE FUNCTION public.on_reputation_adjustment_change();

-- 7. Trigger on donhang (for lethargic orders)
CREATE OR REPLACE FUNCTION public.on_donhang_reputation_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.ten_tu_van_ban_hang IS NOT NULL THEN
            PERFORM public.refresh_user_reputation(NEW.ten_tu_van_ban_hang);
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.ten_tu_van_ban_hang IS NOT NULL THEN
            PERFORM public.refresh_user_reputation(OLD.ten_tu_van_ban_hang);
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_refresh_reputation_on_donhang ON public.donhang;
CREATE TRIGGER tr_refresh_reputation_on_donhang
AFTER INSERT OR UPDATE OR DELETE ON public.donhang
FOR EACH ROW EXECUTE FUNCTION public.on_donhang_reputation_change();

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activities_username_type_date 
ON public.car_hold_activities(username, type, created_at);

CREATE INDEX IF NOT EXISTS idx_donhang_reputation_calc 
ON public.donhang(ten_tu_van_ban_hang, ket_qua);

-- 9. Enable Realtime for reputation cache
ALTER TABLE public.user_reputation_cache REPLICA IDENTITY FULL;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'user_reputation_cache'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reputation_cache;
    END IF;
  END IF;
END $$;
