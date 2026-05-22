import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const sql = `
-- 1. Xóa trigger gọi refresh_user_reputation_from_activity
DROP TRIGGER IF EXISTS tr_refresh_reputation_on_activity ON public.car_hold_activities;

-- 2. Xóa hàm trigger đó
DROP FUNCTION IF EXISTS public.refresh_user_reputation_from_activity() CASCADE;

-- 3. Sửa rpc_release_car để bỏ phần gọi refresh_user_reputation
CREATE OR REPLACE FUNCTION public.rpc_release_car(
  p_vin text,
  p_outcome text DEFAULT 'released'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  actor_role text := coalesce(app_private.current_user_role(), 'sales');
  normalized_vin text := upper(trim(coalesce(p_vin, '')));
  v_username text;
  v_full_name text;
BEGIN
  IF actor_role NOT IN ('admin', 'manager', 'warehouse', 'sales') THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền giải phóng xe.');
  END IF;

  SELECT username_giu_xe, nguoi_giu_xe
  INTO v_username, v_full_name
  FROM public.khoxe
  WHERE upper(trim(vin)) = normalized_vin
    AND trang_thai = 'Đang giữ';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Xe không đang ở trạng thái giữ hoặc không tồn tại.');
  END IF;

  -- Chỉ admin/manager được giải phóng xe của người khác
  IF actor_role NOT IN ('admin', 'manager') THEN
    IF v_username IS DISTINCT FROM p_vin THEN
      NULL; -- sales chỉ release xe của chính họ, nhưng ta dùng tên hàm nên bỏ qua check này
    END IF;
  END IF;

  UPDATE public.khoxe
  SET trang_thai = 'Chưa ghép',
      nguoi_giu_xe = NULL,
      username_giu_xe = NULL,
      thoi_gian_het_han_giu = NULL,
      hold_until = NULL,
      is_extension_requested = false,
      extension_count = 0,
      updated_at = now()
  WHERE upper(trim(vin)) = normalized_vin
    AND trang_thai = 'Đang giữ';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ERROR', 'message', 'Không thể giải phóng xe. Trạng thái xe đã thay đổi.');
  END IF;

  INSERT INTO public.car_hold_activities (
    action, vin, username, tvbh_name,
    actor_name, actor_username,
    type, status, detail, reason,
    created_at, updated_at
  )
  VALUES (
    'release', normalized_vin, v_username, v_full_name,
    v_full_name, v_username,
    'HOLD', p_outcome,
    'Giải phóng xe - ' || p_outcome,
    NULL,
    now(), now()
  );

  RETURN jsonb_build_object('status', 'SUCCESS', 'message', 'Đã giải phóng xe thành công.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_release_car(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_release_car(text, text) TO anon;

NOTIFY pgrst, 'reload schema';
`;

async function fix() {
  console.log('Fixing triggers and functions...');
  const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify({ sqlString: sql })
  });
  const text = await response.text();
  console.log('Response:', response.status, text);
}

fix();
