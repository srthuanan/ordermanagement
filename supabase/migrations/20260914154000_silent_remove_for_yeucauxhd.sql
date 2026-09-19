-- Migration: Tinh chỉnh RPC xuất kho tự động
-- Quy tắc:
-- 1. Nếu xe ĐÃ CÓ trong bảng yeucauxhd (đúng quy trình yêu cầu xuất HĐ):
--    ➔ IM LẶNG: Xóa khỏi khoxe, cập nhật donhang sang 'Đã xuất hóa đơn', KHÔNG TẠO BẤT KỲ THÔNG BÁO NOTIFICATION NÀO!
-- 2. Nếu xe KHÔNG CÓ trong bảng yeucauxhd (xuất bất ngờ / chưa tạo yêu cầu):
--    ➔ MỚI tạo cảnh báo notification cho người đang giữ/ghép biết.

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
    v_today date := CURRENT_DATE;
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
                -- Kiểm tra xem xe này đã có yêu cầu trong yeucauxhd chưa
                SELECT EXISTS (
                    SELECT 1 FROM public.yeucauxhd WHERE upper(trim(vin)) = v_clean_vin
                ) INTO v_has_yeucau;

                -- Tìm đơn hàng tương ứng (nếu có)
                SELECT * INTO v_order_snap 
                FROM public.donhang 
                WHERE upper(trim(vin)) = v_clean_vin 
                ORDER BY thoi_gian_nhap DESC NULLS LAST 
                LIMIT 1;

                -- Cập nhật trạng thái đơn hàng nếu có
                IF v_order_snap.so_don_hang IS NOT NULL THEN
                    UPDATE public.donhang
                    SET 
                        ket_qua = 'Đã xuất hóa đơn',
                        ngay_xuat_hoa_don = COALESCE(ngay_xuat_hoa_don, v_today::text)
                    WHERE so_don_hang = v_order_snap.so_don_hang;
                END IF;

                -- PHÂN NHÁNH THÔNG BÁO:
                IF v_has_yeucau THEN
                    -- KỊCH BẢN 1: ĐÃ CÓ TRONG YEUCAUXHD ➔ IM LẶNG TUYỆT ĐỐI, KHÔNG BẮN THÔNG BÁO
                    v_silent_count := v_silent_count + 1;

                    -- Chỉ ghi LOG audit ngầm để tra cứu hệ thống nếu cần
                    INSERT INTO public.interactions (
                        category, type, actor_id, actor_name, target_id, target_view, message, metadata
                    ) VALUES (
                        'LOG', 
                        'SILENT_REMOVE_SOLD_CAR', 
                        'dms_sync@system.com', 
                        COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync'), 
                        v_clean_vin, 
                        'stock',
                        'Xe ' || v_clean_vin || ' đã có trong yeucauxhd ➔ Im lặng gỡ khỏi kho.',
                        jsonb_build_object(
                            'vin', v_clean_vin,
                            'in_yeucauxhd', true,
                            'order_number', v_order_snap.so_don_hang,
                            'car_snapshot', to_jsonb(v_car_snap)
                        )
                    );

                ELSE
                    -- KỊCH BẢN 2: CHƯA CÓ TRONG YEUCAUXHD ➔ MỚI BẮN THÔNG BÁO CẢNH BÁO
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

                -- Xóa xe khỏi khoxe
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

-- Dọn sạch các thông báo rác vừa tạo
DELETE FROM public.interactions 
WHERE category = 'NOTIFICATION' 
  AND actor_name = 'DMS Auto Sync'
  AND created_at >= NOW() - INTERVAL '15 minutes';
