const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const projectRef = 'jwvgxqrkjlbewvpkvucj';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function executeSql(sql) {
    try {
        const response = await axios.post(
            `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
            { query: sql },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

const sql = `
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.user_request_otp(p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS '
DECLARE
    v_username text;
    v_otp text;
BEGIN
    SELECT username INTO v_username FROM public.users WHERE lower(trim(email)) = lower(trim(p_email));
    IF v_username IS NULL THEN
        RETURN jsonb_build_object(''success'', false, ''message'', ''Email không tồn tại trong hệ thống.'');
    END IF;
    v_otp := floor(random() * 900000 + 100000)::text;
    UPDATE public.users SET otp_code = v_otp, otp_expiry = now() + interval ''15 minutes'' WHERE lower(trim(email)) = lower(trim(p_email));
    RETURN jsonb_build_object(''success'', true, ''message'', ''Mã OTP đã được tạo.'', ''otp'', v_otp, ''username'', v_username);
END;
';

GRANT EXECUTE ON FUNCTION public.user_request_otp(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_reset_password_with_otp(p_email text, p_otp text, p_new_password text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS '
DECLARE
    v_user_otp text;
    v_user_expiry timestamptz;
    v_new_hash text;
BEGIN
    SELECT otp_code, otp_expiry INTO v_user_otp, v_user_expiry FROM public.users WHERE lower(trim(email)) = lower(trim(p_email));
    IF v_user_otp IS NULL OR v_user_otp <> p_otp THEN
        RETURN jsonb_build_object(''success'', false, ''message'', ''Mã OTP không chính xác.'');
    END IF;
    IF v_user_expiry < now() THEN
        RETURN jsonb_build_object(''success'', false, ''message'', ''Mã OTP đã hết hạn.'');
    END IF;
    IF length(p_new_password) < 10 OR p_new_password !~ ''[A-Za-z]'' OR p_new_password !~ ''[0-9]'' THEN
        RETURN jsonb_build_object(''success'', false, ''message'', ''Mật khẩu mới không đủ mạnh. Phải có ít nhất 10 ký tự, bao gồm cả chữ và số.'');
    END IF;
    v_new_hash := encode(digest(p_new_password, ''sha256''), ''hex'');
    UPDATE public.users SET password_hash = v_new_hash, otp_code = NULL, otp_expiry = NULL WHERE lower(trim(email)) = lower(trim(p_email));
    RETURN jsonb_build_object(''success'', true, ''message'', ''Đặt lại mật khẩu thành công.'');
END;
';

GRANT EXECUTE ON FUNCTION public.user_reset_password_with_otp(text, text, text) TO anon, authenticated, service_role;
`;

executeSql(sql);
