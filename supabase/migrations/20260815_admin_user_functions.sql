-- Function to allow Admin to delete a user securely across auth.users and public.users
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
BEGIN
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

-- Grant execution to authenticated & anon roles
GRANT EXECUTE ON FUNCTION admin_delete_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(text) TO anon;
