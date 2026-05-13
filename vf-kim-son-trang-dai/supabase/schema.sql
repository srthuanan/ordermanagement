create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('admin', 'manager', 'sales', 'warehouse', 'delivery', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  area text,
  notes text,
  created_at timestamptz not null default now(),
  unique (phone)
);

create table if not exists public.khoxe (
  vin text primary key,
  dong_xe text not null,
  phien_ban text not null default '',
  ngoai_that text not null default '',
  noi_that text not null default '',
  trang_thai text not null default 'Chưa ghép' check (trang_thai in ('Chưa ghép', 'Đang giữ', 'Đã ghép')),
  nguoi_giu_xe text,
  username_giu_xe text,
  thoi_gian_het_han_giu text,
  vi_tri text,
  ngay_nhap timestamptz,
  ngay_van_tai date,
  so_may text,
  ma_dms text,
  latitude numeric,
  longitude numeric,
  is_extension_requested boolean not null default false,
  extension_evidence_url text,
  extension_reason text,
  extension_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donhang (
  so_don_hang text primary key,
  ten_tu_van_ban_hang text not null,
  ten_khach_hang text not null,
  dong_xe text not null,
  phien_ban text not null default '',
  ngoai_that text not null default '',
  noi_that text not null default '',
  ngay_coc date,
  thoi_gian_can_xe date,
  thoi_gian_nhap timestamptz not null default now(),
  ket_qua text not null default 'Chưa ghép',
  trang_thai_gui_mail text,
  vin text references public.khoxe (vin) on update cascade on delete set null,
  thoi_gian_ghep timestamptz,
  link_hoa_don_da_xuat text,
  link_hop_dong text,
  link_de_nghi_xhd text,
  chinh_sach text,
  ghi_chu_huy text,
  thoi_gian_huy timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.khoxe enable row level security;
alter table public.donhang enable row level security;
alter table public.audit_logs enable row level security;

create schema if not exists app_private;

create or replace function app_private.current_user_role()
returns text
language sql
security definer
set search_path = app_private, public
as $$
  select role from public.profiles where id = auth.uid()
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_role() to authenticated;

drop policy if exists "authenticated can read profiles" on public.profiles;
drop policy if exists "users can create own profile" on public.profiles;
drop policy if exists "authenticated can read customers" on public.customers;
drop policy if exists "sales can manage customers" on public.customers;
drop policy if exists "authenticated can read khoxe" on public.khoxe;
drop policy if exists "warehouse can manage khoxe" on public.khoxe;
drop policy if exists "authenticated can read donhang" on public.donhang;
drop policy if exists "sales can create donhang" on public.donhang;
drop policy if exists "sales can update donhang" on public.donhang;
drop policy if exists "admin can read audit logs" on public.audit_logs;

create policy "authenticated can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id and role = 'staff');

create policy "authenticated can read customers"
on public.customers for select
to authenticated
using (true);

create policy "sales can manage customers"
on public.customers for all
to authenticated
using (app_private.current_user_role() in ('admin', 'manager', 'sales'))
with check (app_private.current_user_role() in ('admin', 'manager', 'sales'));

create policy "authenticated can read khoxe"
on public.khoxe for select
to authenticated
using (true);

create policy "warehouse can manage khoxe"
on public.khoxe for all
to authenticated
using (app_private.current_user_role() in ('admin', 'manager', 'warehouse', 'sales'))
with check (app_private.current_user_role() in ('admin', 'manager', 'warehouse', 'sales'));

create policy "authenticated can read donhang"
on public.donhang for select
to authenticated
using (true);

create policy "sales can create donhang"
on public.donhang for insert
to authenticated
with check (app_private.current_user_role() in ('admin', 'manager', 'sales'));

create policy "sales can update donhang"
on public.donhang for update
to authenticated
using (app_private.current_user_role() in ('admin', 'manager', 'sales', 'delivery'))
with check (app_private.current_user_role() in ('admin', 'manager', 'sales', 'delivery'));

create policy "admin can read audit logs"
on public.audit_logs for select
to authenticated
using (app_private.current_user_role() in ('admin', 'manager'));

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

create index if not exists donhang_ket_qua_idx on public.donhang (ket_qua);
create index if not exists donhang_thoi_gian_nhap_idx on public.donhang (thoi_gian_nhap desc);
create index if not exists donhang_ten_khach_hang_idx on public.donhang using gin (to_tsvector('simple', ten_khach_hang));
create index if not exists donhang_vin_idx on public.donhang (vin);
create index if not exists khoxe_trang_thai_idx on public.khoxe (trang_thai);
create index if not exists khoxe_config_idx on public.khoxe (dong_xe, phien_ban, ngoai_that, noi_that);
create index if not exists khoxe_ngay_nhap_idx on public.khoxe (ngay_nhap);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

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
        is_extension_requested = false,
        extension_reason = null,
        extension_evidence_url = null,
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
