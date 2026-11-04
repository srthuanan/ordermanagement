-- Migration: RPC Tự động xuất kho và lưu vết khi xe đã xuất hóa đơn trên DMS
-- Chức năng:
-- 1. Lưu vết snapshot xe đầy đủ vào bảng interactions (category = 'LOG', type = 'AUTO_REMOVE_SOLD_CAR')
-- 2. Tạo thông báo cho toàn bộ người dùng / Admin (category = 'NOTIFICATION', type = 'stock_alert')
-- 3. Xóa xe khỏi bảng khoxe để kho luôn sạch và chính xác với thực tế
-- 4. An toàn tuyệt đối, có transaction và return danh sách xe đã xử lý

CREATE OR REPLACE FUNCTION public.rpc_auto_remove_sold_cars(
    p_sold_vins text[],
    p_actor_name text DEFAULT 'DMS Auto Sync'
)
RETURNS jsonb AS $$
DECLARE
    v_vin text;
    v_clean_vin text;
    v_car_snap record;
    v_removed_count int := 0;
    v_removed_list jsonb := '[]'::jsonb;
BEGIN
    IF p_sold_vins IS NULL OR array_length(p_sold_vins, 1) = 0 THEN
        RETURN jsonb_build_object('status', 'SUCCESS', 'removed_count', 0, 'removed_cars', v_removed_list);
    END IF;

    FOREACH v_vin IN ARRAY p_sold_vins LOOP
        v_clean_vin := upper(trim(v_vin));
        IF v_clean_vin IS NOT NULL AND length(v_clean_vin) >= 8 THEN
            -- Tìm xe trong kho
            SELECT * INTO v_car_snap FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin LIMIT 1;
            
            IF FOUND THEN
                -- 1. Ghi nhận LOG lưu vết chi tiết (kèm snapshot để có thể tra cứu hoặc phục hồi nếu cần)
                INSERT INTO public.interactions (
                    category, 
                    type, 
                    actor_id, 
                    actor_name, 
                    target_id, 
                    target_view, 
                    message, 
                    metadata
                ) VALUES (
                    'LOG', 
                    'AUTO_REMOVE_SOLD_CAR', 
                    'dms_sync@system.com', 
                    COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync'), 
                    v_clean_vin, 
                    'stock',
                    'Xe ' || v_clean_vin || ' (' || COALESCE(v_car_snap.dong_xe, '') || ' ' || COALESCE(v_car_snap.phien_ban, '') || ') đã xuất hóa đơn trên DMS ➔ Tự động gỡ khỏi kho.',
                    jsonb_build_object(
                        'vin', v_clean_vin,
                        'reason', 'Đã xuất hóa đơn trên DMS VinFast',
                        'dms_code', v_car_snap.ma_dms,
                        'engine_no', v_car_snap.so_may,
                        'snapshot', to_jsonb(v_car_snap)
                    )
                );

                -- 2. Tạo NOTIFICATION thông báo lên hệ thống
                INSERT INTO public.interactions (
                    category, 
                    type, 
                    recipient, 
                    target_view, 
                    target_id, 
                    message, 
                    actor_name
                ) VALUES (
                    'NOTIFICATION',
                    'stock_alert',
                    'ALL',
                    'stock',
                    v_clean_vin,
                    '🚨 Xe <b>' || v_clean_vin || '</b> (' || COALESCE(v_car_snap.dong_xe, '') || ') đã xuất HĐ trên DMS và được tự động xuất khỏi kho xe.',
                    COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync')
                );

                -- 3. Xóa xe khỏi khoxe
                DELETE FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin;

                -- 4. Thêm vào kết quả trả về
                v_removed_count := v_removed_count + 1;
                v_removed_list := v_removed_list || jsonb_build_object(
                    'vin', v_clean_vin,
                    'dong_xe', v_car_snap.dong_xe,
                    'phien_ban', v_car_snap.phien_ban,
                    'ma_dms', v_car_snap.ma_dms
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'removed_count', v_removed_count,
        'removed_cars', v_removed_list
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
