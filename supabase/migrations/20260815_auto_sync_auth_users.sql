-- Migration: Tự động đồng bộ tài khoản từ auth.users sang public.users và tvbh_emails
-- Đảm bảo tên luôn được chuẩn hóa CHỮ IN HOA và liên kết đầy đủ UID

-- 1. Đảm bảo ràng buộc UNIQUE cho cột email trong public.users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND contype = 'u' 
        AND conname = 'users_email_unique'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);
    END IF;
END $$;

-- 2. Hàm trigger tự động đồng bộ khi có user mới trong Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_name TEXT;
    v_full_name TEXT;
    v_username TEXT;
    v_role TEXT;
    v_manager_id TEXT;
BEGIN
    -- Lấy thông tin từ raw_user_meta_data
    v_raw_name := coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    
    -- Chuẩn hóa tên CHỮ IN HOA
    v_full_name := upper(trim(v_raw_name));
    
    -- Username mặc định
    v_username := lower(trim(coalesce(
        new.raw_user_meta_data->>'username',
        split_part(new.email, '@', 1)
    )));
    
    -- Chức vụ mặc định
    v_role := coalesce(new.raw_user_meta_data->>'role', 'Tư vấn bán hàng');
    
    -- Trưởng phòng (nếu có)
    v_manager_id := new.raw_user_meta_data->>'manager_id';

    -- Đồng bộ vào bảng public.users
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
        v_username,
        v_full_name,
        new.email,
        v_role,
        v_manager_id,
        new.id,
        'SUPABASE_AUTH_ONLY',
        false
    )
    ON CONFLICT (email) DO UPDATE SET
        uid = EXCLUDED.uid,
        full_name = EXCLUDED.full_name,
        role = CASE 
            WHEN public.users.role IS NULL OR public.users.role = '' THEN EXCLUDED.role 
            ELSE public.users.role 
        END,
        manager_id = COALESCE(EXCLUDED.manager_id, public.users.manager_id),
        username = CASE 
            WHEN public.users.username IS NULL OR public.users.username = '' THEN EXCLUDED.username 
            ELSE public.users.username 
        END;

    -- Nếu là Tư vấn bán hàng thì đồng bộ luôn sang bảng tvbh_emails
    IF v_role = 'Tư vấn bán hàng' THEN
        INSERT INTO public.tvbh_emails (ten_tvbh, email, updated_at)
        VALUES (v_full_name, new.email, now())
        ON CONFLICT (email) DO UPDATE SET
            ten_tvbh = EXCLUDED.ten_tvbh,
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Tạo Trigger trên bảng auth.users
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
