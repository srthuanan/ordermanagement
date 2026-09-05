-- RPC function for Admin to create or update users in both auth.users and public.users directly with SECURITY DEFINER
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
BEGIN
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
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            phone_change,
            phone_change_token,
            reauthentication_token,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_uid,
            'authenticated',
            'authenticated',
            v_clean_email,
            extensions.crypt(v_clean_password, extensions.gen_salt('bf')),
            now(),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
                'full_name', v_upper_fullname,
                'name', v_upper_fullname,
                'username', v_clean_username,
                'role', p_role,
                'manager_id', v_clean_manager,
                'email_verified', true
            ),
            now(),
            now()
        );

        -- Thêm vào auth.identities để có thể đăng nhập bằng email
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_uid,
            v_uid,
            json_build_object('sub', v_uid::text, 'email', v_clean_email, 'email_verified', false, 'phone_verified', false)::jsonb,
            'email',
            v_uid::text,
            now(),
            now(),
            now()
        ) ON CONFLICT (provider_id, provider) DO UPDATE
        SET identity_data = EXCLUDED.identity_data, updated_at = now();
    END IF;

    -- 2. Upsert vào bảng public.users
    INSERT INTO public.users (
        username,
        full_name,
        email,
        role,
        manager_id,
        uid,
        password_hash,
        is_blocked
    ) VALUES (
        v_clean_username,
        v_upper_fullname,
        v_clean_email,
        p_role,
        v_clean_manager,
        v_uid,
        'SUPABASE_AUTH_ONLY',
        false
    )
    ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        manager_id = EXCLUDED.manager_id,
        uid = EXCLUDED.uid,
        password_hash = 'SUPABASE_AUTH_ONLY',
        is_blocked = false;

    -- 3. Đồng bộ tvbh_emails nếu vai trò là Tư vấn bán hàng
    IF p_role = 'Tư vấn bán hàng' THEN
        INSERT INTO public.tvbh_emails (ten_tvbh, email, updated_at)
        VALUES (v_upper_fullname, v_clean_email, now())
        ON CONFLICT (email) DO UPDATE SET
            ten_tvbh = EXCLUDED.ten_tvbh,
            updated_at = now();
    END IF;

    RETURN json_build_object(
        'success', true,
        'is_new', v_is_new,
        'uid', v_uid,
        'email', v_clean_email,
        'username', v_clean_username,
        'full_name', v_upper_fullname,
        'role', p_role,
        'manager_id', v_clean_manager,
        'password', v_clean_password
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_or_update_user(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_or_update_user(text, text, text, text, text, text) TO anon;
