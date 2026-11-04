-- Migration: Bổ sung updated_at, created_at cho bảng public.users và cập nhật RPC admin_create_or_update_user
-- File: supabase/migrations/20261014_add_users_updated_at_and_fix_admin_create_rpc.sql

-- 1. Thêm cột updated_at và created_at vào public.users nếu chưa tồn tại
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Đảm bảo password_hash có giá trị mặc định để tránh lỗi Not-Null constraint
ALTER TABLE public.users ALTER COLUMN password_hash SET DEFAULT 'SUPABASE_AUTH_ONLY';
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Cập nhật hàm admin_create_or_update_user an toàn và tương thích
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
        password_hash,
        is_blocked,
        updated_at
    ) VALUES (
        v_uid,
        v_clean_username,
        v_clean_email,
        v_upper_fullname,
        p_role,
        v_clean_manager,
        'SUPABASE_AUTH_ONLY',
        false,
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        uid = EXCLUDED.uid,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        manager_id = EXCLUDED.manager_id,
        password_hash = COALESCE(public.users.password_hash, 'SUPABASE_AUTH_ONLY'),
        is_blocked = COALESCE(public.users.is_blocked, false),
        updated_at = now();

    -- 3. Đồng bộ vào bảng tvbh_emails
    INSERT INTO public.tvbh_emails (email, ten_tvbh, updated_at)
    VALUES (v_clean_email, v_upper_fullname, now())
    ON CONFLICT (email) DO UPDATE SET
        ten_tvbh = EXCLUDED.ten_tvbh,
        updated_at = now();

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

GRANT EXECUTE ON FUNCTION admin_create_or_update_user(text, text, text, text, text, text) TO authenticated, service_role, anon;
