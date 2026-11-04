-- Migration: Tắt hoàn toàn tất cả các thông báo NOTIFICATION
-- QUY TẮC:
-- 1. Tuyệt đối KHÔNG gửi bất kỳ thông báo nào (không tạo NOTIFICATION cho TVBH hay Admin).
-- 2. Tự động xóa xe đã xuất HĐ khỏi khoxe.
-- 3. Giữ nguyên trạng thái đơn hàng (không can thiệp donhang).
-- 4. Chỉ ghi nhật ký hệ thống ngầm (category = 'LOG') để phục vụ tra cứu / audit khi cần.

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
            -- Tìm thông tin xe trong kho
            SELECT * INTO v_car_snap FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin LIMIT 1;
            
            IF FOUND THEN
                -- Ghi nhận nhật ký ngầm (LOG) để phục vụ tra cứu nếu cần, KHÔNG TẠO NOTIFICATION
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
                    'Xe ' || v_clean_vin || ' đã xuất HĐ trên DMS ➔ Tự động gỡ khỏi kho xe.',
                    jsonb_build_object(
                        'vin', v_clean_vin,
                        'car_snapshot', to_jsonb(v_car_snap)
                    )
                );

                -- Xóa xe khỏi khoxe
                DELETE FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin;

                v_removed_count := v_removed_count + 1;
                v_removed_list := v_removed_list || jsonb_build_object(
                    'vin', v_clean_vin,
                    'dong_xe', v_car_snap.dong_xe
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

-- Xóa toàn bộ thông báo phát sinh từ DMS Sync
DELETE FROM public.interactions 
WHERE category = 'NOTIFICATION' 
  AND actor_name = 'DMS Auto Sync';
