-- Fix: on_donhang_reputation_change trigger was using ten_tu_van_ban_hang (full name with spaces)
-- as username, which violates no_spaces_in_reputation_username constraint.
-- Now it looks up the actual username from users table first.

CREATE OR REPLACE FUNCTION public.on_donhang_reputation_change()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.ten_tu_van_ban_hang IS NOT NULL THEN
            -- Lookup actual username (no spaces) from users table
            SELECT username INTO v_username FROM public.users 
            WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(NEW.ten_tu_van_ban_hang))
            LIMIT 1;
            
            IF v_username IS NOT NULL THEN
                PERFORM public.refresh_user_reputation(v_username);
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.ten_tu_van_ban_hang IS NOT NULL THEN
            SELECT username INTO v_username FROM public.users 
            WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(OLD.ten_tu_van_ban_hang))
            LIMIT 1;
            
            IF v_username IS NOT NULL THEN
                PERFORM public.refresh_user_reputation(v_username);
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
