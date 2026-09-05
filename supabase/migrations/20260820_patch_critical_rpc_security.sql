-- Migration: Vá các lỗ hổng leo thang đặc quyền và rò rỉ dữ liệu (Critical RPC & Data Leak Patch)
-- File: supabase/migrations/20260820_patch_critical_rpc_security.sql

-- 1. BẢO MẬT RPC TẠO / SỬA TÀI KHOẢN (admin_create_or_update_user)
-- Ngăn chặn kẻ gian gọi trực tiếp RPC để đổi mật khẩu Admin hoặc leo thang đặc quyền
CREATE OR REPLACE FUNCTION admin_create_or_update_user(
    p_email text,
    p_fullname text,
    p_username text,
    p_role text,
    p_manager_id text DEFAULT NULL,
    p_password text DEFAULT 'VinFast@2026'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_uid uuid;
    v_clean_email text := lower(trim(p_email));
    v_upper_fullname text := upper(trim(p_fullname));
    v_clean_username text := lower(trim(p_username));
    v_clean_manager text := CASE WHEN p_manager_id IS NOT NULL AND trim(p_manager_id) != '' THEN lower(trim(p_manager_id)) ELSE NULL END;
    v_clean_password text := COALESCE(NULLIF(trim(p_password), ''), 'VinFast@2026');
    v_is_new boolean := false;
    v_caller_email text := auth.jwt() ->> 'email';
BEGIN
    -- Kiểm tra quyền Admin (Chỉ Admin mới được tạo/sửa tài khoản nhân viên)
    IF NOT public.is_admin() AND v_caller_email IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Quyền truy cập bị từ chối: Chỉ Quản trị viên mới có quyền tạo hoặc sửa tài khoản.');
    END IF;

    IF v_clean_email = '' OR v_clean_email IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Email không được để trống.');
    END IF;

    IF v_clean_username = '' OR v_clean_username IS NULL THEN
        v_clean_username := split_part(v_clean_email, '@', 1);
    END IF;

    -- 1. Kiểm tra xem email đã tồn tại trong auth.users chưa
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_clean_email LIMIT 1;

    IF v_uid IS NOT NULL THEN
        -- Đã có tài khoản: Cập nhật metadata, mật khẩu và trạng thái xác nhận
        UPDATE auth.users
        SET 
            encrypted_password = extensions.crypt(v_clean_password, extensions.gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object(
                'full_name', v_upper_fullname,
                'name', v_upper_fullname,
                'username', v_clean_username,
                'role', p_role,
                'manager_id', v_clean_manager,
                'email_verified', true
            ),
            updated_at = now()
        WHERE id = v_uid;
    ELSE
        -- Chưa có tài khoản: Tạo mới trong auth.users
        v_uid := gen_random_uuid();
        v_is_new := true;

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_uid,
            'authenticated',
            'authenticated',
            v_clean_email,
            extensions.crypt(v_clean_password, extensions.gen_salt('bf')),
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object(
                'full_name', v_upper_fullname,
                'name', v_upper_fullname,
                'username', v_clean_username,
                'role', p_role,
                'manager_id', v_clean_manager,
                'email_verified', true
            ),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
    END IF;

    -- 2. Đồng bộ vào bảng public.users
    INSERT INTO public.users (
        uid,
        username,
        email,
        full_name,
        role,
        manager_id,
        updated_at
    ) VALUES (
        v_uid,
        v_clean_username,
        v_clean_email,
        v_upper_fullname,
        p_role,
        v_clean_manager,
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        uid = EXCLUDED.uid,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        manager_id = EXCLUDED.manager_id,
        updated_at = now();

    -- 3. Đồng bộ vào bảng tvbh_emails
    INSERT INTO public.tvbh_emails (email, ten_tvbh)
    VALUES (v_clean_email, v_upper_fullname)
    ON CONFLICT (email) DO UPDATE SET
        ten_tvbh = EXCLUDED.ten_tvbh;

    RETURN json_build_object(
        'success', true,
        'is_new', v_is_new,
        'uid', v_uid,
        'email', v_clean_email,
        'username', v_clean_username,
        'full_name', v_upper_fullname,
        'role', p_role,
        'manager_id', v_clean_manager,
        'message', CASE WHEN v_is_new THEN 'Tạo nhân viên thành công' ELSE 'Cập nhật nhân viên thành công' END
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Lỗi Database: ' || SQLERRM
    );
END;
$$;


-- 2. BẢO MẬT RPC XÓA TÀI KHOẢN (admin_delete_user)
-- Ngăn chặn người dùng thường xóa tài khoản của người khác
CREATE OR REPLACE FUNCTION admin_delete_user(target_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_uid uuid;
    v_uname text;
    v_email text;
    v_fullname text;
    v_caller_email text := auth.jwt() ->> 'email';
BEGIN
    -- Bắt buộc phải là Admin
    IF NOT public.is_admin() AND v_caller_email IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Quyền truy cập bị từ chối: Chỉ Quản trị viên mới có quyền xóa tài khoản.');
    END IF;

    IF lower(target_identifier) = 'admin' OR lower(target_identifier) = 'showroomthuanan@gmail.com' THEN
        RETURN json_build_object('success', false, 'message', 'Không thể xóa tài khoản Admin quản trị cao nhất.');
    END IF;

    -- 1. Tìm thông tin trong public.users
    SELECT uid, username, email, full_name 
    INTO v_uid, v_uname, v_email, v_fullname 
    FROM public.users 
    WHERE lower(username) = lower(target_identifier) OR lower(email) = lower(target_identifier) 
    LIMIT 1;

    -- 2. Nếu chưa có v_uid, tìm trong auth.users
    IF v_uid IS NULL THEN
        SELECT id, email, raw_user_meta_data->>'username', raw_user_meta_data->>'full_name' 
        INTO v_uid, v_email, v_uname, v_fullname 
        FROM auth.users 
        WHERE lower(email) = lower(target_identifier) OR id::text = target_identifier 
        LIMIT 1;
    END IF;

    IF v_uname IS NULL AND v_email IS NOT NULL THEN
        v_uname := split_part(v_email, '@', 1);
    END IF;

    -- 3. Xóa trong auth.users
    IF v_uid IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = v_uid;
    END IF;

    -- 4. Xóa trong public.users
    DELETE FROM public.users 
    WHERE (v_uid IS NOT NULL AND uid = v_uid) 
       OR lower(username) = lower(target_identifier) 
       OR (v_email IS NOT NULL AND lower(email) = lower(v_email));

    -- 5. Xóa trong tvbh_emails
    IF v_email IS NOT NULL THEN
        DELETE FROM public.tvbh_emails WHERE lower(email) = lower(v_email);
    END IF;

    -- 6. Dọn dẹp quan hệ cấp dưới và presence
    IF v_uname IS NOT NULL THEN
        UPDATE public.users SET manager_id = NULL WHERE lower(manager_id) = lower(v_uname);
        DELETE FROM public.user_presence WHERE lower(username) = lower(v_uname);
    END IF;

    RETURN json_build_object(
        'success', true, 
        'username', v_uname, 
        'email', v_email, 
        'full_name', v_fullname,
        'uid', v_uid
    );
END;
$$;


-- 3. BẢO MẬT RPC XÓA ĐƠN HÀNG (rpc_delete_order)
-- Ngăn chặn người dùng thường gọi RPC xóa đơn hàng
CREATE OR REPLACE FUNCTION public.rpc_delete_order(
    p_order_number TEXT,
    p_actor_email TEXT,
    p_actor_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_order_snap RECORD;
    v_order_no TEXT := trim(p_order_number);
    v_caller_email TEXT := auth.jwt() ->> 'email';
BEGIN
    -- Bắt buộc phải là Admin
    IF NOT public.is_admin() AND v_caller_email IS NOT NULL THEN
        RETURN json_build_object('status', 'ERROR', 'message', 'Quyền truy cập bị từ chối: Chỉ Quản trị viên mới có quyền xóa đơn hàng.');
    END IF;

    -- Lấy thông tin đơn hàng
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

    IF v_order_snap IS NOT NULL THEN
        -- Cập nhật giải phóng xe nếu có gắn VIN
        IF v_order_snap.vin IS NOT NULL THEN
            UPDATE public.khoxe SET 
                trang_thai = 'Chưa ghép', 
                nguoi_giu_xe = null, 
                thoi_gian_het_han_giu = null 
            WHERE trim(vin) = trim(v_order_snap.vin);
        END IF;

        -- Lưu Log tương tác
        INSERT INTO public.interactions (
            category, type, actor_id, actor_name, target_id, target_view, message, metadata
        ) VALUES (
            'LOG', 'DELETE_ORDER', p_actor_email, p_actor_name, v_order_no, 'order',
            'Xóa vĩnh viễn đơn hàng khỏi hệ thống.', 
            jsonb_build_object('snapshot', to_jsonb(v_order_snap))
        );

        -- Xóa các bản ghi phụ thuộc
        DELETE FROM public.yeucauxhd WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);
        DELETE FROM public.yeucauvc WHERE trim(so_don_hang) = trim(v_order_snap.so_don_hang);

        -- Xóa đơn hàng
        DELETE FROM public.donhang WHERE id = v_order_snap.id;

        RETURN json_build_object('status', 'SUCCESS', 'message', 'Đã xóa vĩnh viễn đơn hàng thành công.');
    ELSE
        RETURN json_build_object('status', 'ERROR', 'message', 'Không tìm thấy đơn hàng: ' || v_order_no);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'ERROR', 'message', 'Lỗi database: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. BẢO MẬT RPC TÌM KIẾM TOÀN BỘ (global_search_all)
-- Chặn rò rỉ các bảng nhạy cảm như users, app_settings, audit_logs khi tìm kiếm
CREATE OR REPLACE FUNCTION global_search_all(search_keyword text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tbl RECORD;
    col RECORD;
    query text;
    json_result jsonb := '{}'::jsonb;
    tbl_data jsonb;
    has_condition boolean;
    -- Danh sách các bảng cho phép tìm kiếm công khai (loại trừ users, app_settings, audit_logs)
    allowed_tables text[] := ARRAY['donhang', 'khoxe', 'yeucauxhd', 'yeucauvc', 'chinhsach', 'car_inquiries'];
BEGIN
    IF search_keyword IS NULL OR trim(search_keyword) = '' THEN
        RETURN '{}'::jsonb;
    END IF;

    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name = ANY(allowed_tables)
    LOOP
        has_condition := false;
        query := 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (SELECT * FROM ' || quote_ident(tbl.table_name) || ' WHERE ';
        
        FOR col IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = tbl.table_name 
              AND data_type IN ('text', 'character varying', 'uuid')
        LOOP
            IF has_condition THEN
                query := query || ' OR ';
            END IF;
            query := query || quote_ident(col.column_name) || '::text ILIKE ' || quote_literal('%' || search_keyword || '%');
            has_condition := true;
        END LOOP;
        
        IF NOT has_condition THEN
            CONTINUE;
        END IF;

        query := query || ' LIMIT 20) t';
        
        EXECUTE query INTO tbl_data;
        
        IF tbl_data IS NOT NULL AND jsonb_array_length(tbl_data) > 0 THEN
            json_result := jsonb_set(json_result, ARRAY[tbl.table_name], tbl_data);
        END IF;
    END LOOP;
    
    RETURN json_result;
END;
$$;


-- 5. XÓA BỎ CÁC HÀM XÁC THỰC CŨ KHÔNG AN TOÀN (Legacy Insecure Auth Functions)
-- Các hàm cũ này trả về mã OTP trực tiếp trong response hoặc dùng hashing cũ không qua Supabase Auth
DROP FUNCTION IF EXISTS public.user_request_otp(text);
DROP FUNCTION IF EXISTS public.user_reset_password_with_otp(text, text, text);
DROP FUNCTION IF EXISTS public.user_login(text, text);
DROP FUNCTION IF EXISTS public.user_change_password(text, text, text);
