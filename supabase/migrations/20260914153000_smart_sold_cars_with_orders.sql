-- Migration: Nâng cấp RPC xử lý thông minh khi xe đã xuất HĐ đang ghép cho đơn hàng
-- Quy tắc nghiệp vụ chuẩn:
-- 1. Nếu xe ĐANG GHÉP cho đơn hàng ('Đã ghép'):
--    - Tự động cập nhật đơn hàng tương ứng trong bảng donhang sang 'Đã xuất hóa đơn' (kèm ngày xuất HĐ hôm nay).
--    - Bắn thông báo chúc mừng tới TVBH phụ trách đơn hàng đó.
--    - Ghi nhận đầy đủ thông tin đơn hàng, khách hàng, TVBH vào LOG interactions.
-- 2. Nếu xe ĐANG GIỮ ('Đang giữ'):
--    - Bắn thông báo cảnh báo tới TVBH đang giữ xe đó biết xe đã xuất HĐ.
-- 3. Xóa xe khỏi bảng khoxe để kho xe luôn đồng bộ với thực tế.

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
    v_removed_count int := 0;
    v_matched_order_count int := 0;
    v_removed_list jsonb := '[]'::jsonb;
    v_today date := CURRENT_DATE;
BEGIN
    IF p_sold_vins IS NULL OR array_length(p_sold_vins, 1) = 0 THEN
        RETURN jsonb_build_object('status', 'SUCCESS', 'removed_count', 0, 'matched_order_count', 0, 'removed_cars', v_removed_list);
    END IF;

    FOREACH v_vin IN ARRAY p_sold_vins LOOP
        v_clean_vin := upper(trim(v_vin));
        IF v_clean_vin IS NOT NULL AND length(v_clean_vin) >= 8 THEN
            -- Tìm thông tin xe trong kho
            SELECT * INTO v_car_snap FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin LIMIT 1;
            
            IF FOUND THEN
                -- Kiểm tra xem xe này có đang ghép cho đơn hàng nào không
                SELECT * INTO v_order_snap 
                FROM public.donhang 
                WHERE upper(trim(vin)) = v_clean_vin 
                ORDER BY thoi_gian_nhap DESC NULLS LAST 
                LIMIT 1;

                -- TRƯỜNG HỢP 1: Xe đang ghép cho 1 đơn hàng
                IF v_car_snap.trang_thai = 'Đã ghép' OR v_order_snap.so_don_hang IS NOT NULL THEN
                    v_matched_order_count := v_matched_order_count + 1;

                    -- Tự động cập nhật Đơn hàng sang 'Đã xuất hóa đơn'
                    IF v_order_snap.so_don_hang IS NOT NULL THEN
                        UPDATE public.donhang
                        SET 
                            ket_qua = 'Đã xuất hóa đơn',
                            ngay_xuat_hoa_don = COALESCE(ngay_xuat_hoa_don, v_today::text)
                        WHERE so_don_hang = v_order_snap.so_don_hang;

                        -- Bắn thông báo chúc mừng tới TVBH phụ trách
                        INSERT INTO public.interactions (
                            category, type, recipient, target_view, target_id, message, actor_name
                        ) VALUES (
                            'NOTIFICATION',
                            'invoice_completed',
                            COALESCE(NULLIF(v_order_snap.ten_tu_van_ban_hang, ''), 'ALL'),
                            'orders',
                            v_order_snap.so_don_hang,
                            '🎉 Đơn hàng <b>' || v_order_snap.so_don_hang || '</b> (Khách: ' || COALESCE(v_order_snap.ten_khach_hang, '') || ') - Xe <b>' || v_clean_vin || '</b> đã xuất HĐ thành công trên DMS!',
                            'DMS Auto Sync'
                        );
                    END IF;

                    -- Ghi LOG lưu vết chi tiết cho trường hợp xe đã ghép
                    INSERT INTO public.interactions (
                        category, type, actor_id, actor_name, target_id, target_view, message, metadata
                    ) VALUES (
                        'LOG', 
                        'AUTO_COMPLETE_MATCHED_CAR', 
                        'dms_sync@system.com', 
                        COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync'), 
                        v_clean_vin, 
                        'stock',
                        'Xe ' || v_clean_vin || ' đang ghép cho Đơn hàng ' || COALESCE(v_order_snap.so_don_hang, 'N/A') || ' (TVBH: ' || COALESCE(v_car_snap.nguoi_giu_xe, v_order_snap.ten_tu_van_ban_hang, 'N/A') || ') đã xuất HĐ trên DMS ➔ Tự động cập nhật Đã xuất HĐ và xuất kho.',
                        jsonb_build_object(
                            'vin', v_clean_vin,
                            'order_number', v_order_snap.so_don_hang,
                            'customer_name', v_order_snap.ten_khach_hang,
                            'consultant', COALESCE(v_car_snap.nguoi_giu_xe, v_order_snap.ten_tu_van_ban_hang),
                            'car_snapshot', to_jsonb(v_car_snap),
                            'order_snapshot', to_jsonb(v_order_snap)
                        )
                    );

                -- TRƯỜNG HỢP 2: Xe đang giữ (chưa ghép chính thức)
                ELSIF v_car_snap.trang_thai = 'Đang giữ' THEN
                    -- Báo cho người đang giữ xe biết
                    INSERT INTO public.interactions (
                        category, type, recipient, target_view, target_id, message, actor_name
                    ) VALUES (
                        'NOTIFICATION',
                        'stock_alert',
                        COALESCE(NULLIF(v_car_snap.nguoi_giu_xe, ''), 'ALL'),
                        'stock',
                        v_clean_vin,
                        '⚠️ Xe <b>' || v_clean_vin || '</b> bạn đang giữ đã xuất hóa đơn trên DMS và được tự động gỡ khỏi kho.',
                        'DMS Auto Sync'
                    );

                    INSERT INTO public.interactions (
                        category, type, actor_id, actor_name, target_id, target_view, message, metadata
                    ) VALUES (
                        'LOG', 
                        'AUTO_REMOVE_HELD_CAR', 
                        'dms_sync@system.com', 
                        COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync'), 
                        v_clean_vin, 
                        'stock',
                        'Xe ' || v_clean_vin || ' đang giữ bởi ' || COALESCE(v_car_snap.nguoi_giu_xe, 'N/A') || ' đã xuất HĐ trên DMS ➔ Tự động gỡ khỏi kho.',
                        jsonb_build_object('vin', v_clean_vin, 'held_by', v_car_snap.nguoi_giu_xe, 'snapshot', to_jsonb(v_car_snap))
                    );

                -- TRƯỜNG HỢP 3: Xe chưa ghép (xe tự do trong kho)
                ELSE
                    INSERT INTO public.interactions (
                        category, type, actor_id, actor_name, target_id, target_view, message, metadata
                    ) VALUES (
                        'LOG', 
                        'AUTO_REMOVE_FREE_CAR', 
                        'dms_sync@system.com', 
                        COALESCE(NULLIF(p_actor_name, ''), 'DMS Auto Sync'), 
                        v_clean_vin, 
                        'stock',
                        'Xe tự do ' || v_clean_vin || ' đã xuất HĐ trên DMS ➔ Tự động gỡ khỏi kho.',
                        jsonb_build_object('vin', v_clean_vin, 'snapshot', to_jsonb(v_car_snap))
                    );
                END IF;

                -- Xóa xe khỏi khoxe
                DELETE FROM public.khoxe WHERE upper(trim(vin)) = v_clean_vin;

                -- Thêm vào kết quả
                v_removed_count := v_removed_count + 1;
                v_removed_list := v_removed_list || jsonb_build_object(
                    'vin', v_clean_vin,
                    'dong_xe', v_car_snap.dong_xe,
                    'trang_thai_kho', v_car_snap.trang_thai,
                    'so_don_hang', v_order_snap.so_don_hang,
                    'tvbh', COALESCE(v_car_snap.nguoi_giu_xe, v_order_snap.ten_tu_van_ban_hang)
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'removed_count', v_removed_count,
        'matched_order_count', v_matched_order_count,
        'removed_cars', v_removed_list
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
