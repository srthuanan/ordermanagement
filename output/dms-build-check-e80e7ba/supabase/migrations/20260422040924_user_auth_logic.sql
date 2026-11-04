-- Migration: Cập nhật logic xác thực người dùng (Login & Đổi mật khẩu) trực tiếp trên Supabase
-- Tác dụng: Chuyển toàn bộ gánh nặng xử lý Auth từ GAS sang Supabase để đạt tốc độ tối đa và tính bảo mật cao.

-- Đảm bảo extension pgcrypto được bật để dùng hàm digest (SHA-256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Hàm xử lý Đăng nhập (với SHA-256 hashing)
CREATE OR REPLACE FUNCTION public.user_login(
    p_username TEXT,
    p_password TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_password_hash TEXT;
BEGIN
    v_password_hash := encode(digest(p_password, 'sha256'), 'hex');

    -- Lưu ý: Sử dụng username làm định danh vì bảng users có thể không có cột id
    SELECT username, full_name, role, email INTO v_user
    FROM public.users
    WHERE lower(username) = lower(p_username)
    AND password_hash = v_password_hash;

    IF v_user.username IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên đăng nhập hoặc mật khẩu không đúng.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'username', v_user.username,
        'consultantName', v_user.full_name,
        'role', v_user.role,
        'email', v_user.email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Hàm xử lý Đổi mật khẩu (với SHA-256 hashing)
CREATE OR REPLACE FUNCTION public.user_change_password(
    p_username TEXT,
    p_old_password TEXT,
    p_new_password TEXT
) RETURNS JSONB AS $$
DECLARE
    v_old_hash TEXT;
    v_new_hash TEXT;
    v_existing_username TEXT;
BEGIN
    v_old_hash := encode(digest(p_old_password, 'sha256'), 'hex');
    v_new_hash := encode(digest(p_new_password, 'sha256'), 'hex');

    -- Kiểm tra mật khẩu cũ
    SELECT username INTO v_existing_username
    FROM public.users
    WHERE lower(username) = lower(p_username)
    AND password_hash = v_old_hash;

    IF v_existing_username IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu cũ không chính xác.');
    END IF;

    -- Kiểm tra độ mạnh mật khẩu mới (Tối thiểu 10 ký tự, có cả chữ và số)
    IF length(p_new_password) < 10 OR p_new_password !~ '[A-Za-z]' OR p_new_password !~ '[0-9]' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu mới không đủ mạnh. Phải có ít nhất 10 ký tự, bao gồm cả chữ và số.');
    END IF;

    -- Cập nhật mật khẩu mới
    UPDATE public.users 
    SET password_hash = v_new_hash
    WHERE lower(username) = lower(p_username);

    RETURN jsonb_build_object('success', true, 'message', 'Đổi mật khẩu thành công.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Hàm yêu cầu OTP quên mật khẩu
CREATE OR REPLACE FUNCTION public.user_request_otp(
    p_email TEXT
) RETURNS JSONB AS $$
DECLARE
    v_username TEXT;
    v_otp TEXT;
BEGIN
    -- Kiểm tra email tồn tại
    SELECT username INTO v_username FROM public.users WHERE lower(email) = lower(p_email);
    
    IF v_username IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email không tồn tại trong hệ thống.');
    END IF;

    -- Tạo mã OTP 6 số
    v_otp := floor(random() * 900000 + 100000)::text;

    -- Lưu OTP và thời gian hết hạn (15 phút)
    UPDATE public.users 
    SET otp_code = v_otp, 
        otp_expiry = now() + interval '15 minutes'
    WHERE lower(email) = lower(p_email);

    RETURN jsonb_build_object('success', true, 'message', 'Mã OTP đã được tạo.', 'otp', v_otp, 'username', v_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Hàm đặt lại mật khẩu bằng OTP
CREATE OR REPLACE FUNCTION public.user_reset_password_with_otp(
    p_email TEXT,
    p_otp TEXT,
    p_new_password TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_otp TEXT;
    v_user_expiry TIMESTAMPTZ;
    v_new_hash TEXT;
BEGIN
    SELECT otp_code, otp_expiry INTO v_user_otp, v_user_expiry 
    FROM public.users 
    WHERE lower(email) = lower(p_email);

    IF v_user_otp IS NULL OR v_user_otp <> p_otp THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mã OTP không chính xác.');
    END IF;

    IF v_user_expiry < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mã OTP đã hết hạn.');
    END IF;

    -- Kiểm tra độ mạnh mật khẩu mới
    IF length(p_new_password) < 10 OR p_new_password !~ '[A-Za-z]' OR p_new_password !~ '[0-9]' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu mới không đủ mạnh. Phải có ít nhất 10 ký tự, bao gồm cả chữ và số.');
    END IF;

    v_new_hash := encode(digest(p_new_password, 'sha256'), 'hex');

    -- Cập nhật mật khẩu và xóa OTP
    UPDATE public.users 
    SET password_hash = v_new_hash,
        otp_code = NULL,
        otp_expiry = NULL
    WHERE lower(email) = lower(p_email);

    RETURN jsonb_build_object('success', true, 'message', 'Đặt lại mật khẩu thành công.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cấp quyền thực thi cho các role
GRANT EXECUTE ON FUNCTION public.user_login(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_change_password(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_request_otp(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_reset_password_with_otp(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
