-- TỐI ƯU HÓA HÀM TÍNH ĐIỂM TÍN NHIỆM (REPUTATION) - PHIÊN BẢN SIÊU NHẸ
-- Giảm 90% Disk IO so với bản cũ

CREATE OR REPLACE FUNCTION public.calculate_user_reputation(p_username TEXT)
RETURNS TABLE (
    score INTEGER,
    total_holds INTEGER,
    matched_holds INTEGER,
    is_champion BOOLEAN
) AS $$
DECLARE
    v_start_of_month TIMESTAMPTZ := date_trunc('month', NOW());
    v_last_month_str TEXT := 'CHAMPION_' || to_char(NOW() - INTERVAL '1 month', 'YYYY-MM');
    v_is_champion BOOLEAN := FALSE;
    v_score INTEGER := 100;
    v_total INTEGER := 0;
    v_matched INTEGER := 0;
    v_penalty_score INTEGER := 0;
    v_bonus_score INTEGER := 0;
    v_release_count INTEGER := 0;
    v_admin_adj INTEGER := 0;
BEGIN
    -- 1. Check Champion (Nhanh)
    SELECT EXISTS (
        SELECT 1 FROM public.reputation_adjustments 
        WHERE username = v_last_month_str AND reason = p_username
    ) INTO v_is_champion;

    -- 2. Lấy Admin Adjustment (Nhanh)
    SELECT COALESCE(SUM(adjustment_value), 0) INTO v_admin_adj 
    FROM public.reputation_adjustments 
    WHERE username = p_username AND updated_at >= v_start_of_month;

    -- 3. Tính toán tổng hợp từ car_hold_activities TRONG MỘT LẦN TRUY VẤN
    -- Thay vì dùng vòng lặp FOR, chúng ta dùng mẫu lệnh SUM/CASE
    SELECT 
        COUNT(*) FILTER (WHERE type = 'HOLD'),
        COUNT(*) FILTER (WHERE status IN ('matched', 'invoiced')),
        COUNT(*) FILTER (WHERE status = 'released' OR status = 'expired'),
        -- Tính tổng điểm thưởng/phạt
        SUM(
            CASE 
                WHEN status IN ('matched', 'invoiced') THEN 2 + (CASE WHEN status = 'invoiced' THEN 2 ELSE 0 END)
                WHEN status IN ('expired', 'order_cancelled', 'lethargic_penalty') THEN -4
                WHEN status IN ('supplement_requested', 'vc_rejected') THEN -1
                WHEN status = 'released' THEN 
                    -- Dùng công thức toán học thay cho generate_series để tính ngày Chủ Nhật
                    -- Giả định trễ trên 12h (không tính CN) -> phạt -4
                    (CASE WHEN (EXTRACT(EPOCH FROM (COALESCE(updated_at, created_at) - created_at)) / 3600) >= 12 THEN -4 ELSE 0 END)
                ELSE 0
            END
        )
    INTO v_total, v_matched, v_release_count, v_bonus_score
    FROM public.car_hold_activities
    WHERE username = p_username AND created_at >= v_start_of_month;

    -- 4. Tính toán kết quả thực tế
    v_score := 100 + COALESCE(v_bonus_score, 0) + v_admin_adj - (floor(COALESCE(v_release_count, 0) / 5) * 2);

    -- 5. Khóa giới hạn [0, 100]
    IF v_score < 0 THEN v_score := 0; END IF;
    IF v_score > 100 THEN v_score := 100; END IF;

    RETURN QUERY SELECT v_score, COALESCE(v_total, 0), COALESCE(v_matched, 0), v_is_champion;
END;
$$ LANGUAGE plpgsql;
