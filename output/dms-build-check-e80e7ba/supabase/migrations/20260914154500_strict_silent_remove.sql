-- Migration: Cập nhật chuẩn xác quy tắc im lặng khi xe có trong yeucauxhd
-- QUY TẮC TUYỆT ĐỐI:
-- 1. Nếu xe ĐÃ CÓ trong bảng yeucauxhd:
--    - Tự động xóa xe khỏi khoxe.
--    - TUYỆT ĐỐI KHÔNG CẬP NHẬT đơn hàng sang 'Đã xuất hóa đơn' (giữ nguyên trạng thái đơn hàng!).
--    - HOÀN TOÀN KHÔNG BẮN THÔNG BÁO NOTIFICATION.
-- 2. Nếu xe KHÔNG CÓ trong bảng yeucauxhd:
--    - Mới tạo cảnh báo thông báo để TVBH/Admin biết xe bị xuất ngoài.
--    - Xóa xe khỏi khoxe.

CREATE OR REPLACE FUNCTION public.rpc_auto_remove_sold_cars(
    p_sold_vins text[],
    p_actor_name text DEFAULT 'DMS Auto Sync'
)
RETURNS jsonb AS $$
DECLARE
    v_vin text;
    v_clean_vin text;
    v_car_snap record;
    v_order_snap record;
    v_has_yeucau boolean;
    v_removed_count int := 0;
    v_silent_count int := 0;
    v_notified_count int := 0;
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
                -- Kiểm tra xem xe này đã có trong bảng yeucauxhd chưa
                SELECT EXISTS (
                    SELECT 1 FROM public.yeucauxhd WHERE upper(trim(vin)) = v_clean_vin
                ) INTO v_has_yeucau;

                -- Tìm đơn hàng tương ứng (nếu có để phục vụ log hoặc cảnh báo)
                SELECT * INTO v_order_snap 
                FROM public.donhang 
                WHERE upper(trim(vin)) = v_clean_vin 
                ORDER BY thoi_gian_nhap DESC NULLS LAST 
                LIMIT 1;

                IF v_has_yeucau THEN
                    -- KỊCH BẢN 1: ĐÃ CÓ TRONG YEUCAUXHD
                    -- 1. IM LẶNG TUYỆT ĐỐI: KHÔNG bắn thông báo (NOTIFICATION)
                    -- 2. GIỮ NGUYÊN trạng thái đơn hàng (KHÔNG cập nhật bảng donhang)
                    -- 3. Chỉ ghi 1 dòng LOG audit ngầm để lưu vết lịch sử
                    v_silent_count := v_silent_count + 1;

                    INSERT INTO public.interactions (
                        category, type, actor_id, actor_name, target_id, target_view, message, metadata
                    ) VALUES (
                        'LOG', 
                        'SILENT_REMOVE_SOLD_CAR', 
                        'dms_sync@system.com', 
                        COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync'), 
                        v_clean_vin, 
                        'stock',
                        'Xe ' || v_clean_vin || ' có trong yeucauxhd ➔ Im lặng gỡ khỏi kho, giữ nguyên trạng thái đơn hàng.',
                        jsonb_build_object(
                            'vin', v_clean_vin,
                            'in_yeucauxhd', true,
                            'order_number', v_order_snap.so_don_hang,
                            'car_snapshot', to_jsonb(v_car_snap)
                        )
                    );

                ELSE
                    -- KỊCH BẢN 2: CHƯA CÓ TRONG YEUCAUXHD (Xuất bất ngờ / chưa tạo yêu cầu)
                    -- Mới bắn thông báo cảnh báo tới người phụ trách
                    v_notified_count := v_notified_count + 1;

                    IF v_car_snap.trang_thai = 'Đã ghép' AND v_order_snap.so_don_hang IS NOT NULL THEN
                        INSERT INTO public.interactions (
                            category, type, recipient, target_view, target_id, message, actor_name
                        ) VALUES (
                            'NOTIFICATION',
                            'invoice_completed',
                            COALESCE(NULLIF(v_order_snap.ten_tu_van_ban_hang, ''), 'ALL'),
                            'orders',
                            v_order_snap.so_don_hang,
                            '⚠️ Xe <b>' || v_clean_vin || '</b> (ĐH: ' || v_order_snap.so_don_hang || ') đã xuất HĐ trên DMS và được gỡ khỏi kho.',
                            'DMS Auto Sync'
                        );
                    ELSIF v_car_snap.trang_thai = 'Đang giữ' THEN
                        INSERT INTO public.interactions (
                            category, type, recipient, target_view, target_id, message, actor_name
                        ) VALUES (
                            'NOTIFICATION',
                            'stock_alert',
                            COALESCE(NULLIF(v_car_snap.nguoi_giu_xe, ''), 'ALL'),
                            'stock',
                            v_clean_vin,
                            '⚠️ Xe <b>' || v_clean_vin || '</b> bạn đang giữ đã xuất HĐ trên DMS và được gỡ khỏi kho.',
                            'DMS Auto Sync'
                        );
                    END IF;

                    INSERT INTO public.interactions (
                        category, type, actor_id, actor_name, target_id, target_view, message, metadata
                    ) VALUES (
                        'LOG', 
                        'AUTO_REMOVE_SOLD_CAR', 
                        'dms_sync@system.com', 
                        COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync'), 
                        v_clean_vin, 
                        'stock',
                        'Xe ' || v_clean_vin || ' chưa có trong yeucauxhd đã xuất HĐ trên DMS ➔ Gỡ khỏi kho.',
                        jsonb_build_object(
                            'vin', v_clean_vin,
                            'in_yeucauxhd', false,
                            'car_snapshot', to_jsonb(v_car_snap)
                        )
                    );
                END IF;

                -- XÓA XE KHỎI KHOXE
                DELETE FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin;

                v_removed_count := v_removed_count + 1;
                v_removed_list := v_removed_list || jsonb_build_object(
                    'vin', v_clean_vin,
                    'has_yeucau', v_has_yeucau,
                    'dong_xe', v_car_snap.dong_xe
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'removed_count', v_removed_count,
        'silent_count', v_silent_count,
        'notified_count', v_notified_count,
        'removed_cars', v_removed_list
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
