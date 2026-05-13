create or replace function public.cancel_order_donhang(
  p_order_id text,
  p_note text default null,
  p_order_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  actor_id uuid := auth.uid();
  actor_name text := coalesce((select full_name from public.profiles where id = actor_id), auth.jwt() ->> 'email', 'Nhân viên');
  actor_username text := coalesce(auth.jwt() ->> 'email', actor_id::text);
  order_row public.donhang;
  vehicle_row public.khoxe;
  paired_vin text;
begin
  if actor_role not in ('admin', 'manager', 'sales', 'delivery') then
    raise exception 'Bạn không có quyền hủy đơn';
  end if;

  select * into order_row
  from public.donhang
  where so_don_hang = p_order_id
  for update;

  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;

  if p_order_updated_at is not null and order_row.updated_at <> p_order_updated_at then
    raise exception 'Đơn hàng đã thay đổi, vui lòng tải lại';
  end if;

  if order_row.ket_qua = 'Đã xuất hóa đơn' then
    raise exception 'Không thể hủy đơn đã xuất hóa đơn';
  end if;

  paired_vin := order_row.vin;

  if order_row.ket_qua = 'Đã ghép' and coalesce(paired_vin, '') <> '' then
    update public.khoxe
    set trang_thai = 'Chưa ghép',
        nguoi_giu_xe = null,
        username_giu_xe = null,
        thoi_gian_het_han_giu = null,
        hold_until = null,
        updated_at = now()
    where vin = paired_vin
    returning * into vehicle_row;
  end if;

  update public.donhang
  set ket_qua = 'Đã hủy',
      ghi_chu_huy = coalesce(nullif(p_note, ''), ghi_chu_huy),
      thoi_gian_huy = now(),
      vin = null,
      thoi_gian_ghep = null,
      updated_at = now()
  where so_don_hang = p_order_id
  returning * into order_row;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_id, actor_name, actor_username, detail)
  values ('cancel_order', order_row.so_don_hang, paired_vin, actor_id, actor_name, actor_username, coalesce(nullif(p_note, ''), 'Hủy đơn hàng'));

  return jsonb_build_object(
    'order_id', order_row.so_don_hang,
    'order_status', order_row.ket_qua,
    'vin_released', paired_vin
  );
end;
$$;

grant execute on function public.cancel_order_donhang(text, text, timestamptz) to authenticated;
