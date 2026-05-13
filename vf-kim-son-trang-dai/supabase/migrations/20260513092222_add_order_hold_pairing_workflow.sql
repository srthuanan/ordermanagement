drop policy if exists "users can create own profile" on public.profiles;

create policy "users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id and role = 'staff');

grant insert on public.profiles to authenticated;

create or replace function public.hold_khoxe_vehicle(p_vin text, p_hold_until timestamptz)
returns public.khoxe
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  actor_name text := coalesce(
    (select full_name from public.profiles where id = auth.uid()),
    auth.jwt() ->> 'email',
    'Nhân viên'
  );
  actor_username text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  vehicle_row public.khoxe;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales') then
    raise exception 'Bạn không có quyền giữ xe';
  end if;

  update public.khoxe
  set trang_thai = 'Đang giữ',
      nguoi_giu_xe = actor_name,
      username_giu_xe = actor_username,
      thoi_gian_het_han_giu = to_char(p_hold_until at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI'),
      updated_at = now()
  where vin = p_vin
    and trang_thai <> 'Đã ghép'
    and (
      trang_thai = 'Chưa ghép'
      or coalesce(username_giu_xe, '') = actor_username
      or actor_role in ('admin', 'manager', 'warehouse')
    )
  returning * into vehicle_row;

  if not found then
    raise exception 'Xe này không thể giữ ở thời điểm hiện tại';
  end if;

  return vehicle_row;
end;
$$;

create or replace function public.release_khoxe_hold(p_vin text)
returns public.khoxe
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  actor_username text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  vehicle_row public.khoxe;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales') then
    raise exception 'Bạn không có quyền bỏ giữ xe';
  end if;

  update public.khoxe
  set trang_thai = 'Chưa ghép',
      nguoi_giu_xe = null,
      username_giu_xe = null,
      thoi_gian_het_han_giu = null,
      updated_at = now()
  where vin = p_vin
    and trang_thai <> 'Đã ghép'
    and (
      coalesce(username_giu_xe, '') = ''
      or coalesce(username_giu_xe, '') = actor_username
      or actor_role in ('admin', 'manager', 'warehouse')
    )
  returning * into vehicle_row;

  if not found then
    raise exception 'Xe này không thể bỏ giữ ở thời điểm hiện tại';
  end if;

  return vehicle_row;
end;
$$;

create or replace function public.pair_donhang_with_khoxe(p_order_id text, p_vin text)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  actor_username text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  order_row public.donhang;
  vehicle_row public.khoxe;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales') then
    raise exception 'Bạn không có quyền ghép xe';
  end if;

  select * into order_row
  from public.donhang
  where so_don_hang = p_order_id
  for update;

  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;

  if order_row.ket_qua in ('Đã hủy', 'Đã xuất hóa đơn') then
    raise exception 'Đơn hàng này không thể ghép xe';
  end if;

  if coalesce(order_row.vin, '') <> '' then
    raise exception 'Đơn hàng đã có VIN';
  end if;

  select * into vehicle_row
  from public.khoxe
  where vin = p_vin
  for update;

  if not found then
    raise exception 'Không tìm thấy xe trong kho';
  end if;

  if vehicle_row.trang_thai = 'Đã ghép' then
    raise exception 'Xe này đã được ghép';
  end if;

  if order_row.dong_xe <> vehicle_row.dong_xe
     or coalesce(order_row.phien_ban, '') <> coalesce(vehicle_row.phien_ban, '')
     or coalesce(order_row.ngoai_that, '') <> coalesce(vehicle_row.ngoai_that, '')
     or coalesce(order_row.noi_that, '') <> coalesce(vehicle_row.noi_that, '') then
    raise exception 'Cấu hình xe không khớp với đơn hàng';
  end if;

  if vehicle_row.trang_thai = 'Đang giữ'
     and coalesce(vehicle_row.username_giu_xe, '') <> actor_username
     and actor_role not in ('admin', 'manager', 'warehouse') then
    raise exception 'Xe này đang do người khác giữ';
  end if;

  update public.donhang
  set ket_qua = 'Đã ghép',
      vin = p_vin,
      thoi_gian_ghep = now(),
      updated_at = now()
  where so_don_hang = p_order_id
  returning * into order_row;

  update public.khoxe
  set trang_thai = 'Đã ghép',
      nguoi_giu_xe = order_row.ten_tu_van_ban_hang,
      username_giu_xe = actor_username,
      thoi_gian_het_han_giu = 'Vô thời hạn',
      updated_at = now()
  where vin = p_vin
  returning * into vehicle_row;

  return jsonb_build_object(
    'order_id', order_row.so_don_hang,
    'vin', vehicle_row.vin,
    'order_status', order_row.ket_qua,
    'vehicle_status', vehicle_row.trang_thai
  );
end;
$$;

grant execute on function public.hold_khoxe_vehicle(text, timestamptz) to authenticated;
grant execute on function public.release_khoxe_hold(text) to authenticated;
grant execute on function public.pair_donhang_with_khoxe(text, text) to authenticated;
