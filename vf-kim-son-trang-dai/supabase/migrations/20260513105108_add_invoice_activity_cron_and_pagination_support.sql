create extension if not exists pg_cron;

alter table if exists public.khoxe
  add column if not exists hold_until timestamptz;

create table if not exists public.car_hold_activities (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('hold', 'release', 'pair', 'unpair', 'expire_hold', 'request_invoice', 'finalize_invoice', 'cancel_order')),
  so_don_hang text,
  vin text,
  actor_id uuid references auth.users (id),
  actor_name text,
  actor_username text,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.yeucauxhd (
  id uuid primary key default gen_random_uuid(),
  so_don_hang text not null references public.donhang (so_don_hang) on update cascade on delete cascade,
  ten_khach_hang text not null,
  vin text references public.khoxe (vin) on update cascade on delete set null,
  requested_by uuid references auth.users (id),
  requested_by_name text,
  requested_by_username text,
  link_de_nghi_xhd text,
  chinh_sach text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references auth.users (id),
  approved_by_name text,
  approved_by_username text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.car_hold_activities enable row level security;
alter table public.yeucauxhd enable row level security;

drop policy if exists "authenticated can read car_hold_activities" on public.car_hold_activities;
drop policy if exists "staff can insert car_hold_activities" on public.car_hold_activities;
drop policy if exists "authenticated can read yeucauxhd" on public.yeucauxhd;
drop policy if exists "staff can manage yeucauxhd" on public.yeucauxhd;

create policy "authenticated can read car_hold_activities"
on public.car_hold_activities for select
to authenticated
using (true);

create policy "staff can insert car_hold_activities"
on public.car_hold_activities for insert
to authenticated
with check (app_private.current_user_role() in ('admin', 'manager', 'warehouse', 'sales', 'delivery'));

create policy "authenticated can read yeucauxhd"
on public.yeucauxhd for select
to authenticated
using (true);

create policy "staff can manage yeucauxhd"
on public.yeucauxhd for all
to authenticated
using (app_private.current_user_role() in ('admin', 'manager', 'sales', 'delivery'))
with check (app_private.current_user_role() in ('admin', 'manager', 'sales', 'delivery'));

create or replace function public.expire_khoxe_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
begin
  with expired_rows as (
    update public.khoxe
    set trang_thai = 'Chưa ghép',
        nguoi_giu_xe = null,
        username_giu_xe = null,
        thoi_gian_het_han_giu = null,
        hold_until = null,
        updated_at = now()
    where trang_thai = 'Đang giữ'
      and hold_until is not null
      and hold_until <= now()
    returning vin
  )
  insert into public.car_hold_activities (action, vin, detail)
  select 'expire_hold', vin, 'Auto release by pg_cron'
  from expired_rows;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'khoxe-auto-release-expired-holds';

select cron.schedule(
  'khoxe-auto-release-expired-holds',
  '*/5 * * * *',
  $$select public.expire_khoxe_holds();$$
);

create or replace function public.hold_khoxe_vehicle_safe(
  p_vin text,
  p_hold_until timestamptz,
  p_expected_updated_at timestamptz default null
)
returns public.khoxe
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  actor_id uuid := auth.uid();
  actor_name text := coalesce((select full_name from public.profiles where id = actor_id), auth.jwt() ->> 'email', 'Nhân viên');
  actor_username text := coalesce(auth.jwt() ->> 'email', actor_id::text);
  vehicle_row public.khoxe;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales') then
    raise exception 'Bạn không có quyền giữ xe';
  end if;

  update public.khoxe
  set trang_thai = 'Đang giữ',
      nguoi_giu_xe = actor_name,
      username_giu_xe = actor_username,
      hold_until = p_hold_until,
      thoi_gian_het_han_giu = to_char(p_hold_until at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI'),
      updated_at = now()
  where vin = p_vin
    and trang_thai <> 'Đã ghép'
    and (p_expected_updated_at is null or updated_at = p_expected_updated_at)
    and (
      trang_thai = 'Chưa ghép'
      or coalesce(username_giu_xe, '') = actor_username
      or actor_role in ('admin', 'manager', 'warehouse')
    )
  returning * into vehicle_row;

  if not found then
    raise exception 'Xe đã bị thay đổi bởi người khác hoặc không thể giữ lúc này';
  end if;

  insert into public.car_hold_activities (action, vin, actor_id, actor_name, actor_username, detail)
  values ('hold', vehicle_row.vin, actor_id, actor_name, actor_username, 'Giữ xe đến ' || coalesce(vehicle_row.thoi_gian_het_han_giu, ''));

  return vehicle_row;
end;
$$;

create or replace function public.release_khoxe_hold_safe(
  p_vin text,
  p_expected_updated_at timestamptz default null
)
returns public.khoxe
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  actor_id uuid := auth.uid();
  actor_name text := coalesce((select full_name from public.profiles where id = actor_id), auth.jwt() ->> 'email', 'Nhân viên');
  actor_username text := coalesce(auth.jwt() ->> 'email', actor_id::text);
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
      hold_until = null,
      updated_at = now()
  where vin = p_vin
    and trang_thai <> 'Đã ghép'
    and (p_expected_updated_at is null or updated_at = p_expected_updated_at)
    and (
      coalesce(username_giu_xe, '') = ''
      or coalesce(username_giu_xe, '') = actor_username
      or actor_role in ('admin', 'manager', 'warehouse')
    )
  returning * into vehicle_row;

  if not found then
    raise exception 'Xe đã bị thay đổi bởi người khác hoặc không thể bỏ giữ';
  end if;

  insert into public.car_hold_activities (action, vin, actor_id, actor_name, actor_username, detail)
  values ('release', vehicle_row.vin, actor_id, actor_name, actor_username, 'Bỏ giữ xe');

  return vehicle_row;
end;
$$;

create or replace function public.pair_donhang_with_khoxe_safe(
  p_order_id text,
  p_vin text,
  p_order_updated_at timestamptz default null,
  p_vehicle_updated_at timestamptz default null
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

  if p_order_updated_at is not null and order_row.updated_at <> p_order_updated_at then
    raise exception 'Đơn hàng đã thay đổi, vui lòng tải lại';
  end if;

  if order_row.ket_qua in ('Đã hủy', 'Đã xuất hóa đơn') or coalesce(order_row.vin, '') <> '' then
    raise exception 'Đơn hàng không thể ghép ở trạng thái hiện tại';
  end if;

  select * into vehicle_row
  from public.khoxe
  where vin = p_vin
  for update;

  if not found then
    raise exception 'Không tìm thấy xe trong kho';
  end if;

  if p_vehicle_updated_at is not null and vehicle_row.updated_at <> p_vehicle_updated_at then
    raise exception 'Xe đã thay đổi, vui lòng tải lại';
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
    raise exception 'Xe đang do người khác giữ';
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
      hold_until = null,
      updated_at = now()
  where vin = p_vin
  returning * into vehicle_row;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_id, actor_name, actor_username, detail)
  values ('pair', order_row.so_don_hang, vehicle_row.vin, actor_id, actor_name, actor_username, 'Ghép xe cho đơn');

  return jsonb_build_object(
    'order_id', order_row.so_don_hang,
    'vin', vehicle_row.vin,
    'order_status', order_row.ket_qua,
    'vehicle_status', vehicle_row.trang_thai
  );
end;
$$;

create or replace function public.unpair_donhang_with_khoxe_safe(
  p_order_id text,
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

  if p_order_updated_at is not null and order_row.updated_at <> p_order_updated_at then
    raise exception 'Đơn hàng đã thay đổi, vui lòng tải lại';
  end if;

  if order_row.ket_qua <> 'Đã ghép' then
    raise exception 'Chỉ hủy ghép được đơn đang ở trạng thái Đã ghép';
  end if;

  paired_vin := order_row.vin;
  if coalesce(paired_vin, '') = '' then
    raise exception 'Không tìm thấy VIN ghép';
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
      hold_until = null,
      updated_at = now()
  where vin = paired_vin
  returning * into vehicle_row;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_id, actor_name, actor_username, detail)
  values ('unpair', order_row.so_don_hang, paired_vin, actor_id, actor_name, actor_username, 'Hủy ghép xe');

  return jsonb_build_object(
    'order_id', order_row.so_don_hang,
    'vin', paired_vin,
    'order_status', order_row.ket_qua,
    'vehicle_status', vehicle_row.trang_thai
  );
end;
$$;

create or replace function public.request_invoice_donhang(
  p_order_id text,
  p_link_de_nghi_xhd text,
  p_chinh_sach text,
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
  req_row public.yeucauxhd;
begin
  if actor_role not in ('admin', 'manager', 'sales', 'delivery') then
    raise exception 'Bạn không có quyền tạo yêu cầu xuất hóa đơn';
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

  if order_row.ket_qua <> 'Đã ghép' then
    raise exception 'Chỉ tạo yêu cầu xuất hóa đơn cho đơn đã ghép';
  end if;

  update public.donhang
  set trang_thai_gui_mail = 'pending',
      link_de_nghi_xhd = nullif(p_link_de_nghi_xhd, ''),
      chinh_sach = coalesce(nullif(p_chinh_sach, ''), chinh_sach),
      updated_at = now()
  where so_don_hang = p_order_id
  returning * into order_row;

  insert into public.yeucauxhd (
    so_don_hang,
    ten_khach_hang,
    vin,
    requested_by,
    requested_by_name,
    requested_by_username,
    link_de_nghi_xhd,
    chinh_sach,
    status
  )
  values (
    order_row.so_don_hang,
    order_row.ten_khach_hang,
    order_row.vin,
    actor_id,
    actor_name,
    actor_username,
    nullif(p_link_de_nghi_xhd, ''),
    coalesce(nullif(p_chinh_sach, ''), order_row.chinh_sach),
    'pending'
  )
  returning * into req_row;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_id, actor_name, actor_username, detail)
  values ('request_invoice', order_row.so_don_hang, order_row.vin, actor_id, actor_name, actor_username, 'Tạo yêu cầu xuất hóa đơn');

  return jsonb_build_object('request_id', req_row.id, 'order_id', order_row.so_don_hang, 'status', req_row.status);
end;
$$;

create or replace function public.finalize_invoice_donhang(
  p_request_id uuid,
  p_link_hoa_don_da_xuat text,
  p_link_hop_dong text,
  p_mail_status text default 'sent'
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
  req_row public.yeucauxhd;
  order_row public.donhang;
begin
  if actor_role not in ('admin', 'manager', 'delivery') then
    raise exception 'Bạn không có quyền chốt xuất hóa đơn';
  end if;

  select * into req_row
  from public.yeucauxhd
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Không tìm thấy yêu cầu xuất hóa đơn';
  end if;

  if req_row.status <> 'pending' then
    raise exception 'Yêu cầu này đã được xử lý';
  end if;

  update public.yeucauxhd
  set status = 'approved',
      approved_by = actor_id,
      approved_by_name = actor_name,
      approved_by_username = actor_username,
      note = 'Đã chốt xuất hóa đơn',
      updated_at = now()
  where id = p_request_id
  returning * into req_row;

  update public.donhang
  set ket_qua = 'Đã xuất hóa đơn',
      trang_thai_gui_mail = coalesce(nullif(p_mail_status, ''), 'sent'),
      link_hoa_don_da_xuat = nullif(p_link_hoa_don_da_xuat, ''),
      link_hop_dong = nullif(p_link_hop_dong, ''),
      updated_at = now()
  where so_don_hang = req_row.so_don_hang
  returning * into order_row;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_id, actor_name, actor_username, detail)
  values ('finalize_invoice', order_row.so_don_hang, order_row.vin, actor_id, actor_name, actor_username, 'Chốt xuất hóa đơn');

  return jsonb_build_object('request_id', req_row.id, 'order_id', order_row.so_don_hang, 'order_status', order_row.ket_qua);
end;
$$;

grant select, insert on public.car_hold_activities to authenticated;
grant select, insert, update on public.yeucauxhd to authenticated;
grant execute on function public.expire_khoxe_holds() to authenticated;
grant execute on function public.hold_khoxe_vehicle_safe(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.release_khoxe_hold_safe(text, timestamptz) to authenticated;
grant execute on function public.pair_donhang_with_khoxe_safe(text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.unpair_donhang_with_khoxe_safe(text, timestamptz) to authenticated;
grant execute on function public.request_invoice_donhang(text, text, text, timestamptz) to authenticated;
grant execute on function public.finalize_invoice_donhang(uuid, text, text, text) to authenticated;

create index if not exists car_hold_activities_created_at_idx on public.car_hold_activities (created_at desc);
create index if not exists car_hold_activities_order_idx on public.car_hold_activities (so_don_hang);
create index if not exists car_hold_activities_vin_idx on public.car_hold_activities (vin);
create index if not exists yeucauxhd_order_idx on public.yeucauxhd (so_don_hang, created_at desc);
create index if not exists yeucauxhd_status_idx on public.yeucauxhd (status, created_at desc);
