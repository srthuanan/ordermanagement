-- Migration: Vá lỗ hổng tranh chấp giữ xe đồng thời (Race Condition Prevention via Pessimistic Row Locking)
-- File: supabase/migrations/20260820_patch_part2_race_condition_hold_car.sql

-- Nâng cấp hàm rpc_hold_car với khóa dòng (FOR UPDATE) chống xung đột 2 người cùng giữ 1 xe tại cùng 1 giây
CREATE OR REPLACE FUNCTION public.rpc_hold_car(p_vin TEXT, p_username TEXT, p_full_name TEXT)
RETURNS JSON AS $$
DECLARE
    v_clean_vin TEXT := upper(trim(p_vin));
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
BEGIN
    IF v_clean_vin IS NULL OR v_clean_vin = '' THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Số VIN không hợp lệ.');
    END IF;

    -- 0. KHÓA DÒNG BẢN GHI XE (Pessimistic Row Lock - FOR UPDATE)
    -- Giúp ngăn chặn 100% tình trạng 2 TVBH cùng ấn giữ xe tại cùng 1 mili-giây
    SELECT trang_thai INTO v_car_status 
    FROM public.khoxe 
    WHERE upper(trim(vin)) = v_clean_vin 
    FOR UPDATE;

    IF v_car_status IS NULL THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy thông tin xe trong hệ thống.');
    END IF;
    
    IF v_car_status <> 'Chưa ghép' THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không thể giữ xe. Trạng thái hiện tại: ' || v_car_status);
    END IF;

    -- ============================================================
    -- ADMIN EXEMPTION: NO LIMITS, NO COOLDOWNS, NO REPUTATION CHECK
    -- ============================================================
    IF lower(p_username) = 'admin' THEN
        v_hold_exp_date := v_now + (24 * INTERVAL '1 hour'); -- Default 24h
        
        -- Gia hạn ngày chủ nhật nếu cần
        IF EXISTS (
            SELECT 1 FROM generate_series(v_now, v_hold_exp_date, '1 hour'::interval) s
            WHERE EXTRACT(DOW FROM s) = 0
        ) THEN
            v_hold_exp_date := v_hold_exp_date + INTERVAL '24 hours';
        END IF;
        
        v_hold_exp_str := to_char(v_hold_exp_date AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI:SS');

        UPDATE public.khoxe SET
            trang_thai = 'Đang giữ',
            nguoi_giu_xe = p_full_name,
            username_giu_xe = p_username,
            thoi_gian_het_han_giu = v_hold_exp_str,
            is_extension_requested = false,
            extension_count = 0
        WHERE upper(trim(vin)) = v_clean_vin AND trang_thai = 'Chưa ghép';

        INSERT INTO public.car_hold_activities (vin, username, tvbh_name, status, type, created_at, updated_at)
        VALUES (v_clean_vin, p_username, p_full_name, 'active', 'HOLD', v_now, v_now);

        RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã giữ xe thành công (Chế độ Quản trị viên)');
    END IF;
    -- ============================================================

    -- 1. Lấy thông tin điểm uy tín & hạng TVBH từ cache (An toàn)
    v_reputation_score := 100;
    v_reputation_total := 0;
    v_is_champion := FALSE;

    IF to_regclass('public.user_reputation_cache') IS NOT NULL THEN
        SELECT score, total_holds, is_champion 
        INTO v_reputation_score, v_reputation_total, v_is_champion 
        FROM public.user_reputation_cache 
        WHERE username = p_username;
    END IF;

    IF v_reputation_score IS NULL THEN
        v_reputation_score := 100;
    END IF;

    -- Logic giới hạn theo hạng
    IF v_reputation_score >= 85 THEN v_max_holds := 5; v_rank_name := 'Tinh Anh (Hạng S)';
    ELSIF v_reputation_score >= 65 THEN v_max_holds := 4; v_rank_name := 'Chuyên nghiệp (Hạng A)';
    ELSIF v_reputation_score >= 40 THEN v_max_holds := 3; v_rank_name := 'Tiêu chuẩn (Hạng B)';
    ELSIF v_reputation_score >= 15 THEN v_max_holds := 2; v_rank_name := 'Cơ bản (Hạng C)';
    ELSIF v_reputation_score > 0 THEN v_max_holds := 1; v_rank_name := 'Thử thách (Hạng D)';
    ELSE v_max_holds := 0; v_rank_name := 'Bị khóa';
    END IF;

    IF v_is_champion IS TRUE AND v_max_holds > 0 THEN
        v_max_holds := v_max_holds + 1;
        v_rank_name := v_rank_name || ' + Thưởng Quán Quân';
    END IF;

    -- Kiểm tra số xe đang giữ hiện tại
    SELECT count(*) INTO v_current_count FROM public.khoxe WHERE username_giu_xe = p_username AND trang_thai = 'Đang giữ';

    IF v_current_count >= v_max_holds THEN
        IF v_max_holds = 0 THEN
            RETURN json_build_object('status', 'ERROR', 'message', 'Tài khoản bị khóa chức năng giữ xe do uy tín quá thấp (' || v_reputation_score || '%).');
        ELSE
            RETURN json_build_object('status', 'ERROR', 'message', 'Giới hạn: Hạng ' || v_rank_name || ' chỉ được giữ tối đa ' || v_max_holds || ' xe. Bạn đang giữ ' || v_current_count || ' xe.');
        END IF;
    END IF;

    -- 2. Cooling-off (2 hours sau khi giải phóng)
    SELECT EXTRACT(EPOCH FROM (v_now - updated_at)) / 3600 INTO v_recent_release_diff_hours
    FROM public.car_hold_activities
    WHERE upper(trim(vin)) = v_clean_vin AND username = p_username AND type = 'HOLD' AND status IN ('released', 'expired')
    ORDER BY updated_at DESC LIMIT 1;

    IF v_recent_release_diff_hours IS NOT NULL AND v_recent_release_diff_hours < 2 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Bạn vừa giải phóng xe này. Vui lòng đợi ' || ceil((2 - v_recent_release_diff_hours) * 60) || ' phút nữa để giữ lại.');
    END IF;

    -- 3. Global Cooldown (15 mins sau khi giữ lâu)
    SELECT EXTRACT(EPOCH FROM (v_now - updated_at)) / 60 INTO v_global_cooldown_minutes
    FROM public.car_hold_activities
    WHERE upper(trim(vin)) = v_clean_vin AND type = 'HOLD' AND status IN ('released', 'expired')
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
        RETURN json_build_object('status', 'SPAM_BLOCK', 'message', 'Hành vi spam giữ-nhả (' || v_spam_count || ' lượt/10p). Hệ thống tạm ngắt kết nối để cảnh báo.');
    END IF;

    -- 5. Priority Check
    SELECT username, (updated_at + INTERVAL '15 minutes') INTO v_priority_user, v_priority_expiry
    FROM public.car_hold_activities
    WHERE upper(trim(vin)) = v_clean_vin AND type = 'QUEUE' AND status = 'prioritized'
    ORDER BY updated_at DESC LIMIT 1;

    IF v_priority_user IS NOT NULL THEN
        IF v_now < v_priority_expiry THEN
            IF v_priority_user <> p_username THEN
                RETURN json_build_object('status', 'ERROR', 'message', 'Xe đang trong 15 phút ưu tiên dành riêng cho người khác.');
            ELSE
                DELETE FROM public.car_hold_activities WHERE upper(trim(vin)) = v_clean_vin AND username = p_username AND type = 'QUEUE';
            END IF;
        ELSE
            DELETE FROM public.car_hold_activities WHERE upper(trim(vin)) = v_clean_vin AND username = v_priority_user AND type = 'QUEUE';
        END IF;
    END IF;

    -- 6. Anti-camping (số lần giữ trong 7 ngày)
    SELECT count(*) INTO v_past_hold_count
    FROM public.car_hold_activities
    WHERE upper(trim(vin)) = v_clean_vin AND username = p_username AND type = 'HOLD' AND created_at >= (v_now - INTERVAL '7 days');

    IF v_past_hold_count = 1 THEN v_hold_hours := 12;
    ELSIF v_past_hold_count = 2 THEN v_hold_hours := 6;
    ELSIF v_past_hold_count >= 3 THEN v_hold_hours := 2;
    END IF;

    v_hold_exp_date := v_now + (v_hold_hours * INTERVAL '1 hour');
    
    IF EXISTS (
        SELECT 1 FROM generate_series(v_now, v_hold_exp_date, '1 hour'::interval) s
        WHERE EXTRACT(DOW FROM s) = 0
    ) THEN
        v_hold_exp_date := v_hold_exp_date + INTERVAL '24 hours';
    END IF;

    v_hold_exp_str := to_char(v_hold_exp_date AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI:SS');

    -- 7. Thực hiện giữ xe
    UPDATE public.khoxe SET
        trang_thai = 'Đang giữ',
        nguoi_giu_xe = p_full_name,
        username_giu_xe = p_username,
        thoi_gian_het_han_giu = v_hold_exp_str,
        is_extension_requested = false,
        extension_count = 0
    WHERE upper(trim(vin)) = v_clean_vin AND trang_thai = 'Chưa ghép';

    IF NOT FOUND THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không thể giữ xe. Trạng thái xe đã thay đổi bởi người khác.');
    END IF;

    INSERT INTO public.car_hold_activities (vin, username, tvbh_name, status, type, created_at, updated_at)
    VALUES (v_clean_vin, p_username, p_full_name, 'active', 'HOLD', v_now, v_now);

    RETURN json_build_object(
        'status', 'SUCCESS', 
        'message', 'Đã giữ xe thành công' || CASE WHEN v_past_hold_count > 0 THEN ' (Lần giữ thứ ' || (v_past_hold_count+1) || ' trong 7 ngày, thời gian rút ngắn còn ' || v_hold_hours || 'h)' ELSE '' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
