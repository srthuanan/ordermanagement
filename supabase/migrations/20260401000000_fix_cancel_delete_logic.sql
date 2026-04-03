-- Migration: Fix Cancel/Delete logic to actually REMOVE records from donhang
-- Created: 2026-04-01
-- Root cause: RLS trên bảng donhang KHÔNG có policy cho DELETE, 
-- nên mọi lệnh DELETE từ anon role đều bị chặn hoàn toàn.
-- Giải pháp: SECURITY DEFINER function bypass RLS, nhưng cần đảm bảo function 
-- được gọi đúng và logic frontend không bị lỗi trước khi tới RPC.

-- 0. Ensure schema consistency
ALTER TABLE public.car_hold_activities ADD COLUMN IF NOT EXISTS reason TEXT;

-- =========================================================
-- QUAN TRỌNG: Thêm DELETE policy cho bảng donhang
-- Vì SECURITY DEFINER function bypass RLS, nhưng để an toàn 
-- cho các trường hợp gọi trực tiếp, ta vẫn cần policy.
-- Service role (supabaseAdmin) LUÔN bypass RLS.
-- =========================================================

-- Thêm DELETE policy cho donhang (cho phép từ anon thông qua RPC SECURITY DEFINER)
-- Lưu ý: Thực tế DELETE chỉ nên xảy ra qua RPC, không qua client trực tiếp
DROP POLICY IF EXISTS "Allow delete on donhang via rpc" ON public.donhang;
CREATE POLICY "Allow delete on donhang via rpc" ON public.donhang 
    FOR DELETE USING (true);

-- Thêm DELETE policy cho yeucauxhd (nếu chưa có riêng)
DROP POLICY IF EXISTS "Allow delete on yeucauxhd" ON public.yeucauxhd;
CREATE POLICY "Allow delete on yeucauxhd" ON public.yeucauxhd 
    FOR DELETE USING (true);

-- Thêm DELETE policy cho yeucauvc (nếu chưa có riêng)
DROP POLICY IF EXISTS "Allow delete on yeucauvc" ON public.yeucauvc;
CREATE POLICY "Allow delete on yeucauvc" ON public.yeucauvc 
    FOR DELETE USING (true);


-- 1. Update rpc_cancel_order_request to DELETE (with robust error handling)
CREATE OR REPLACE FUNCTION public.rpc_cancel_order_request(
    p_order_numbers TEXT[],
    p_reason TEXT,
    p_actor_email TEXT,
    p_actor_name TEXT,
    p_vins TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    v_order_no TEXT;
    v_order_snap RECORD;
    v_count INTEGER := 0;
    v_vin TEXT;
BEGIN
    -- PHASE 1: Search by Order Numbers
    FOR v_order_no IN SELECT unnest(p_order_numbers) LOOP
        v_order_no := trim(v_order_no);
        
        -- Tìm kiếm chính xác trước, sau đó ILIKE, sau đó normalize
        SELECT * INTO v_order_snap FROM public.donhang 
        WHERE trim(so_don_hang) = v_order_no
        LIMIT 1;
        
        -- Fallback: ILIKE match
        IF v_order_snap IS NULL THEN
            SELECT * INTO v_order_snap FROM public.donhang 
            WHERE so_don_hang ILIKE v_order_no
            LIMIT 1;
        END IF;
        
        -- Fallback: UUID match
        IF v_order_snap IS NULL AND v_order_no ~ '^[0-9a-fA-F-]{36}$' THEN
            SELECT * INTO v_order_snap FROM public.donhang 
            WHERE id::text = v_order_no
            LIMIT 1;
        END IF;

        -- Fallback: Normalize O/0 matching
        IF v_order_snap IS NULL THEN
            SELECT * INTO v_order_snap FROM public.donhang 
            WHERE REPLACE(regexp_replace(upper(so_don_hang), '[^A-Z0-9]', '', 'g'), 'O', '0') 
                  = REPLACE(regexp_replace(upper(v_order_no), '[^A-Z0-9]', '', 'g'), 'O', '0')
            LIMIT 1;
        END IF;

        IF v_order_snap IS NOT NULL THEN
            -- Release car if paired
            IF v_order_snap.vin IS NOT NULL THEN
                UPDATE public.khoxe SET 
                    trang_thai = 'Chưa ghép', nguoi_giu_xe = null, thoi_gian_het_han_giu = null 
                WHERE trim(vin) = trim(v_order_snap.vin);
            END IF;

            -- Log before delete (snapshot preserved)
            BEGIN
                INSERT INTO public.interactions (category, type, actor_id, actor_name, target_id, target_view, message, metadata) 
                VALUES ('LOG', 'CANCEL_REQUEST', p_actor_email, p_actor_name, v_order_no, 'order', 'Hủy và xóa đơn hàng', jsonb_build_object('reason', p_reason, 'snapshot', to_jsonb(v_order_snap)));
            EXCEPTION WHEN OTHERS THEN
                -- Log failure is non-critical, continue
                NULL;
            END;

            -- Delete related records (ignore if not found)
            DELETE FROM public.yeucauxhd WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);
            DELETE FROM public.yeucauvc WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);
            
            -- Delete the order itself
            DELETE FROM public.donhang WHERE id = v_order_snap.id;

            v_count := v_count + 1;
        END IF;
    END LOOP;

    -- PHASE 2: Fallback search by VINs (only if Phase 1 found nothing)
    IF v_count = 0 AND p_vins IS NOT NULL AND array_length(p_vins, 1) > 0 THEN
        FOR v_vin IN SELECT unnest(p_vins) LOOP
            v_vin := trim(v_vin);
            IF v_vin = '' THEN CONTINUE; END IF;
            
            SELECT * INTO v_order_snap FROM public.donhang WHERE trim(vin) = v_vin LIMIT 1;
            
            IF v_order_snap IS NOT NULL THEN
                UPDATE public.khoxe SET 
                    trang_thai = 'Chưa ghép', nguoi_giu_xe = null, thoi_gian_het_han_giu = null 
                WHERE trim(vin) = trim(v_order_snap.vin);

                BEGIN
                    INSERT INTO public.interactions (category, type, actor_id, actor_name, target_id, target_view, message, metadata) 
                    VALUES ('LOG', 'CANCEL_REQUEST_BY_VIN', p_actor_email, p_actor_name, v_vin, 'order', 'Hủy đơn hàng qua VIN fallback', jsonb_build_object('reason', p_reason, 'snapshot', to_jsonb(v_order_snap)));
                EXCEPTION WHEN OTHERS THEN NULL;
                END;

                DELETE FROM public.yeucauxhd WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);
                DELETE FROM public.yeucauvc WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);
                DELETE FROM public.donhang WHERE id = v_order_snap.id;

                v_count := v_count + 1;
            END IF;
        END LOOP;
    END IF;

    IF v_count = 0 THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy hồ sơ để hủy.');
    END IF;

    RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã hủy ' || v_count || ' yêu cầu.');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update rpc_delete_order to actually DELETE (with EXCEPTION handler)
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
    -- Get order snapshot - try exact match first
    SELECT * INTO v_order_snap FROM public.donhang 
    WHERE trim(so_don_hang) = v_order_no
    LIMIT 1;
    
    -- Fallback: UUID match
    IF v_order_snap IS NULL AND v_order_no ~ '^[0-9a-fA-F-]{36}$' THEN
        SELECT * INTO v_order_snap FROM public.donhang 
        WHERE id::text = v_order_no
        LIMIT 1;
    END IF;

    -- Fallback: ILIKE match
    IF v_order_snap IS NULL THEN
        SELECT * INTO v_order_snap FROM public.donhang 
        WHERE so_don_hang ILIKE v_order_no
        LIMIT 1;
    END IF;

    -- Fallback: Normalize O/0 matching
    IF v_order_snap IS NULL THEN
        SELECT * INTO v_order_snap FROM public.donhang 
        WHERE REPLACE(regexp_replace(upper(so_don_hang), '[^A-Z0-9]', '', 'g'), 'O', '0') 
              = REPLACE(regexp_replace(upper(v_order_no), '[^A-Z0-9]', '', 'g'), 'O', '0')
        LIMIT 1;
    END IF;

    IF v_order_snap IS NOT NULL THEN
        -- Update car status if paired
        IF v_order_snap.vin IS NOT NULL THEN
            UPDATE public.khoxe SET 
                trang_thai = 'Chưa ghép', 
                nguoi_giu_xe = null, 
                thoi_gian_het_han_giu = null 
            WHERE trim(vin) = trim(v_order_snap.vin);
        END IF;

        -- Log Action
        INSERT INTO public.interactions (
            category, type, actor_id, actor_name, target_id, target_view, message, metadata
        ) VALUES (
            'LOG', 'DELETE_ORDER', p_actor_email, p_actor_name, v_order_no, 'order',
            'Xóa vĩnh viễn đơn hàng khỏi hệ thống.', 
            jsonb_build_object('snapshot', to_jsonb(v_order_snap))
        );

        -- DELETE related records first to avoid foreign key constraints
        DELETE FROM public.yeucauxhd WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);
        DELETE FROM public.yeucauvc WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);

        -- Actually DELETE
        DELETE FROM public.donhang WHERE id = v_order_snap.id;

        RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã xóa vĩnh viễn đơn hàng thành công.');
    ELSE
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy đơn hàng: ' || v_order_no);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
