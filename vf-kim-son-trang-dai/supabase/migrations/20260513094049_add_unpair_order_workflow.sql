create or replace function public.unpair_donhang_with_khoxe(p_order_id text)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  order_row public.donhang;
  vehicle_row public.khoxe;
  paired_vin text;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales') then
    raise exception 'Bạn không có quyền hủy ghép xe';
  end if;

  select * into order_row
  from public.donhang
  where so_don_hang = p_order_id
  for update;

  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;

  if order_row.ket_qua <> 'Đã ghép' then
    raise exception 'Chỉ hủy ghép được đơn đang ở trạng thái Đã ghép';
  end if;

  if coalesce(order_row.vin, '') = '' then
    raise exception 'Đơn hàng này không có VIN để hủy ghép';
  end if;

  paired_vin := order_row.vin;

  select * into vehicle_row
  from public.khoxe
  where vin = paired_vin
  for update;

  if not found then
    raise exception 'Không tìm thấy xe đang ghép';
  end if;

  update public.donhang
  set ket_qua = 'Chưa ghép',
      vin = null,
      thoi_gian_ghep = null,
      updated_at = now()
  where so_don_hang = p_order_id
  returning * into order_row;

  update public.khoxe
  set trang_thai = 'Chưa ghép',
      nguoi_giu_xe = null,
      username_giu_xe = null,
      thoi_gian_het_han_giu = null,
      updated_at = now()
  where vin = paired_vin
  returning * into vehicle_row;

  return jsonb_build_object(
    'order_id', order_row.so_don_hang,
    'vin', paired_vin,
    'order_status', order_row.ket_qua,
    'vehicle_status', vehicle_row.trang_thai
  );
end;
$$;

grant execute on function public.unpair_donhang_with_khoxe(text) to authenticated;
