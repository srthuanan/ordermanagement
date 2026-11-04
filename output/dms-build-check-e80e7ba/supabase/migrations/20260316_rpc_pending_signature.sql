-- Migration: Create RPCs for Admin Actions to ensure atomicity and consistency on Supabase
-- Date: 2026-03-16

-- 1. RPC to Mark Orders as Pending Signature
CREATE OR REPLACE FUNCTION public.rpc_mark_as_pending_signature(
    p_order_numbers TEXT[],
    p_ngay_xuat_hoa_don DATE,
    p_actor_email TEXT,
    p_actor_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_order_no TEXT;
    v_tvbh_name TEXT;
    v_count INTEGER := 0;
    v_affected INTEGER;
BEGIN
    IF array_length(p_order_numbers, 1) IS NULL OR array_length(p_order_numbers, 1) = 0 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Danh sách số đơn hàng trống.');
    END IF;

    FOR v_order_no IN SELECT unnest(p_order_numbers) LOOP
        v_order_no := trim(v_order_no);
        
        -- Get consultant name for notification
        SELECT ten_tu_van_ban_hang INTO v_tvbh_name 
        FROM public.donhang 
        WHERE trim(so_don_hang) = v_order_no;

        -- Update donhang. Triggers handle synchronization to yeucauxhd.
        UPDATE public.donhang SET
            ket_qua = 'Chờ ký hóa đơn',
            ngay_xuat_hoa_don = COALESCE(p_ngay_xuat_hoa_don, ngay_xuat_hoa_don)
        WHERE trim(so_don_hang) = v_order_no;
        
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        
        IF v_affected > 0 THEN
            -- Override if date is explicitly provided
            IF p_ngay_xuat_hoa_don IS NOT NULL THEN
                UPDATE public.donhang SET ngay_xuat_hoa_don = p_ngay_xuat_hoa_don WHERE trim(so_don_hang) = v_order_no;
                UPDATE public.yeucauxhd SET ngay_xuat_hoa_don = p_ngay_xuat_hoa_don WHERE trim(so_don_hang) = v_order_no;
            END IF;

            -- Log Action
            INSERT INTO public.interactions (
                category, type, actor_id, actor_name, target_id, target_view, message, metadata
            ) VALUES (
                'LOG', 'PENDING_SIGNATURE', p_actor_email, p_actor_name, v_order_no, 'order',
                'Chuyển trạng thái sang Chờ ký hóa đơn',
                jsonb_build_object('ngay_xuat_hoa_don', p_ngay_xuat_hoa_don)
            );

            -- Create Notification
            IF v_tvbh_name IS NOT NULL THEN
                INSERT INTO public.interactions (
                    category, type, message, recipient, target_view, target_id, actor_name, is_read
                ) VALUES (
                    'NOTIFICATION', 'info', 'Hóa đơn cho ĐH ' || v_order_no || ' đã sẵn sàng, vui lòng ký hóa đơn.',
                    v_tvbh_name, 'orders', v_order_no, p_actor_name, false
                );
            END IF;

            v_count := v_count + 1;
        END IF;
    END LOOP;

    IF v_count = 0 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy đơn hàng nào để cập nhật. Vui lòng kiểm tra lại số đơn hàng.');
    END IF;

    RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã chuyển trạng thái sang Chờ ký hóa đơn cho ' || v_count || ' đơn hàng.', 'count', v_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC to Approve Invoice Request
CREATE OR REPLACE FUNCTION public.rpc_approve_invoice_request(
    p_order_numbers TEXT[],
    p_actor_email TEXT,
    p_actor_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_order_no TEXT;
    v_tvbh_name TEXT;
    v_count INTEGER := 0;
    v_affected INTEGER;
BEGIN
    FOR v_order_no IN SELECT unnest(p_order_numbers) LOOP
        v_order_no := trim(v_order_no);
        
        SELECT ten_tu_van_ban_hang INTO v_tvbh_name FROM public.donhang WHERE trim(so_don_hang) = v_order_no;

        UPDATE public.donhang SET ket_qua = 'Đã phê duyệt' WHERE trim(so_don_hang) = v_order_no;
        GET DIAGNOSTICS v_affected = ROW_COUNT;

        IF v_affected > 0 THEN
            INSERT INTO public.interactions (
                category, type, actor_id, actor_name, target_id, target_view, message
            ) VALUES (
                'LOG', 'APPROVE_INVOICE_REQUEST', p_actor_email, p_actor_name, v_order_no, 'invoice_bulk',
                'Phê duyệt yêu cầu xuất hóa đơn'
            );

            IF v_tvbh_name IS NOT NULL THEN
                INSERT INTO public.interactions (
                    category, type, message, recipient, target_view, target_id, actor_name, is_read
                ) VALUES (
                    'NOTIFICATION', 'success', 'Yêu cầu xuất hóa đơn cho ĐH ' || v_order_no || ' đã được phê duyệt.',
                    v_tvbh_name, 'orders', v_order_no, p_actor_name, false
                );
            END IF;

            v_count := v_count + 1;
        END IF;
    END LOOP;

    IF v_count = 0 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy yêu cầu nào để phê duyệt.');
    END IF;

    RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã phê duyệt ' || v_count || ' yêu cầu thành công.', 'count', v_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC to Request Supplement
CREATE OR REPLACE FUNCTION public.rpc_request_supplement(
    p_order_numbers TEXT[],
    p_reason TEXT,
    p_actor_email TEXT,
    p_actor_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_order_no TEXT;
    v_tvbh_name TEXT;
    v_vin TEXT;
    v_count INTEGER := 0;
    v_affected INTEGER;
BEGIN
    FOR v_order_no IN SELECT unnest(p_order_numbers) LOOP
        v_order_no := trim(v_order_no);
        
        SELECT ten_tu_van_ban_hang, vin INTO v_tvbh_name, v_vin FROM public.donhang WHERE trim(so_don_hang) = v_order_no;

        -- Update both tables
        UPDATE public.yeucauxhd SET ghi_chu_admin = p_reason WHERE trim(so_don_hang) = v_order_no;
        UPDATE public.donhang SET ket_qua = 'Yêu cầu bổ sung' WHERE trim(so_don_hang) = v_order_no;
        
        GET DIAGNOSTICS v_affected = ROW_COUNT;

        IF v_affected > 0 THEN
            INSERT INTO public.interactions (
                category, type, actor_id, actor_name, target_id, target_view, message, metadata
            ) VALUES (
                'LOG', 'REQUEST_SUPPLEMENT', p_actor_email, p_actor_name, v_order_no, 'invoice_bulk',
                'Yêu cầu bổ sung hồ sơ', jsonb_build_object('reason', p_reason)
            );

            IF v_tvbh_name IS NOT NULL THEN
                IF v_vin IS NOT NULL THEN
                    INSERT INTO public.car_hold_activities (
                        vin, username, tvbh_name, type, status, reason, created_at, updated_at
                    ) VALUES (
                        v_vin, v_tvbh_name, v_tvbh_name, 'PENALTY', 'supplement_requested', 
                        'Bổ sung HS: ' || substring(p_reason from 1 for 50), NOW(), NOW()
                    );
                END IF;

                INSERT INTO public.interactions (
                    category, type, message, recipient, target_view, target_id, actor_name, is_read
                ) VALUES (
                    'NOTIFICATION', 'warning', 'Yêu cầu xuất hóa đơn cho ĐH ' || v_order_no || ' cần bổ sung: ' || p_reason,
                    v_tvbh_name, 'orders', v_order_no, p_actor_name, false
                );
            END IF;

            v_count := v_count + 1;
        END IF;
    END LOOP;

    IF v_count = 0 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy đơn hàng nào để gửi yêu cầu bổ sung.');
    END IF;

    RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã gửi yêu cầu bổ sung cho ' || v_count || ' yêu cầu.', 'count', v_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC to Cancel Order Request
CREATE OR REPLACE FUNCTION public.rpc_cancel_order_request(
    p_order_numbers TEXT[],
    p_reason TEXT,
    p_actor_email TEXT,
    p_actor_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_order_no TEXT;
    v_order_snap RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_order_no IN SELECT unnest(p_order_numbers) LOOP
        v_order_no := trim(v_order_no);
        
        -- Get order snapshot
        SELECT * INTO v_order_snap FROM public.donhang WHERE trim(so_don_hang) = v_order_no;

        IF v_order_snap IS NOT NULL THEN
            -- Update car status if paired
            IF v_order_snap.vin IS NOT NULL THEN
                UPDATE public.khoxe SET 
                    trang_thai = 'Chưa ghép', 
                    nguoi_giu_xe = null, 
                    thoi_gian_het_han_giu = null 
                WHERE trim(vin) = trim(v_order_snap.vin);
            END IF;

            -- Update donhang
            UPDATE public.donhang SET 
                ket_qua = 'Đã hủy', 
                ghi_chu_huy = 'Bị Admin hủy. Lý do: ' || p_reason, 
                thoi_gian_huy = NOW() 
            WHERE trim(so_don_hang) = v_order_no;

            -- Update yeucauxhd
            UPDATE public.yeucauxhd SET ghi_chu_admin = p_reason WHERE trim(so_don_hang) = v_order_no;

            -- Log Action
            INSERT INTO public.interactions (
                category, type, actor_id, actor_name, target_id, target_view, message, metadata
            ) VALUES (
                'LOG', 'CANCEL_REQUEST', p_actor_email, p_actor_name, v_order_no, 'order',
                'Hủy yêu cầu/đơn hàng', 
                jsonb_build_object('reason', p_reason, 'snapshot', to_jsonb(v_order_snap))
            );

            v_count := v_count + 1;
        END IF;
    END LOOP;

    IF v_count = 0 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy hồ sơ nào để hủy.');
    END IF;

    RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã hủy ' || v_count || ' yêu cầu thành công.', 'count', v_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC to Delete/Cancel Single Order Logic
CREATE OR REPLACE FUNCTION public.rpc_delete_order(
    p_order_number TEXT,
    p_actor_email TEXT,
    p_actor_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_order_snap RECORD;
    v_order_no TEXT := trim(p_order_number);
BEGIN
    -- Get order snapshot
    SELECT * INTO v_order_snap FROM public.donhang WHERE trim(so_don_hang) = v_order_no;

    IF v_order_snap IS NOT NULL THEN
        -- Update car status if paired
        IF v_order_snap.vin IS NOT NULL THEN
            UPDATE public.khoxe SET 
                trang_thai = 'Chưa ghép', 
                nguoi_giu_xe = null, 
                thoi_gian_het_han_giu = null 
            WHERE trim(vin) = trim(v_order_snap.vin);
        END IF;

        -- Update donhang
        UPDATE public.donhang SET 
            ket_qua = 'Đã hủy', 
            ghi_chu_huy = 'Bị Admin xóa khỏi hệ thống.', 
            thoi_gian_huy = NOW() 
        WHERE trim(so_don_hang) = v_order_no;

        -- Log Action
        INSERT INTO public.interactions (
            category, type, actor_id, actor_name, target_id, target_view, message, metadata
        ) VALUES (
            'LOG', 'DELETE_ORDER', p_actor_email, p_actor_name, v_order_no, 'order',
            'Xóa đơn hàng khỏi hệ thống', 
            jsonb_build_object('snapshot', to_jsonb(v_order_snap))
        );

        RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã xóa đơn hàng thành công.');
    ELSE
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy đơn hàng: ' || v_order_no);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
