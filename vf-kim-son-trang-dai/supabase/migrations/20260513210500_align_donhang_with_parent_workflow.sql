alter table if exists public.donhang
  add column if not exists so_may text,
  add column if not exists ma_dms text,
  add column if not exists so_ngay_ghep integer,
  add column if not exists ngay_xuat_hoa_don date;

create table if not exists public.chinhsach (
  ten_chinh_sach text primary key,
  dong_xe text,
  han_su_dung text,
  trang_thai text not null default 'Hoạt động' check (trang_thai in ('Hoạt động', 'Ngừng hoạt động')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chinhsach enable row level security;

drop policy if exists "authenticated can read chinhsach" on public.chinhsach;
drop policy if exists "managers can manage chinhsach" on public.chinhsach;

create policy "authenticated can read chinhsach"
on public.chinhsach for select
to authenticated
using (true);

create policy "managers can manage chinhsach"
on public.chinhsach for all
to authenticated
using (app_private.current_user_role() in ('admin', 'manager'))
with check (app_private.current_user_role() in ('admin', 'manager'));

insert into public.chinhsach (ten_chinh_sach, dong_xe, trang_thai)
values
  ('Ưu đãi giao xe tháng hiện hành', 'Tất cả', 'Hoạt động'),
  ('Hỗ trợ lãi suất ngân hàng', 'VF 5,VF 6,VF 7,VF 8,VF 9', 'Hoạt động'),
  ('Thu cũ đổi mới xe điện', 'VF 6,VF 7,VF 8,VF 9', 'Hoạt động')
on conflict (ten_chinh_sach) do nothing;

create or replace function public.sync_donhang_vehicle_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vehicle_row public.khoxe;
begin
  if coalesce(new.vin, '') = '' then
    new.so_may := null;
    new.ma_dms := null;
    return new;
  end if;

  select * into vehicle_row
  from public.khoxe
  where vin = new.vin
  limit 1;

  if found then
    new.so_may := vehicle_row.so_may;
    new.ma_dms := vehicle_row.ma_dms;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_donhang_vehicle_meta on public.donhang;
create trigger trg_sync_donhang_vehicle_meta
before insert or update of vin on public.donhang
for each row
execute function public.sync_donhang_vehicle_meta();

update public.donhang d
set so_may = k.so_may,
    ma_dms = k.ma_dms
from public.khoxe k
where d.vin = k.vin;

drop function if exists public.cancel_order_donhang(text, text, timestamptz);

create or replace function public.cancel_order_donhang(
  p_order_id text,
  p_note text default null,
  p_unmatch_type text default 'Hủy luôn đơn hàng (Hủy đơn)',
  p_thoi_gian_can_xe date default null,
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
  wait_mode boolean := (
    coalesce(lower(p_unmatch_type), '') like '%chờ xe%'
    or coalesce(lower(p_unmatch_type), '') like '%cho xe%'
  );
  next_status text;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales', 'delivery') then
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
  next_status := case when wait_mode then 'Chưa ghép' else 'Đã hủy' end;

  if coalesce(paired_vin, '') <> '' then
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
  set ket_qua = next_status,
      ghi_chu_huy = coalesce(nullif(p_note, ''), ghi_chu_huy),
      thoi_gian_huy = now(),
      vin = null,
      so_may = null,
      ma_dms = null,
      thoi_gian_ghep = null,
      thoi_gian_can_xe = case
        when wait_mode then coalesce(p_thoi_gian_can_xe, thoi_gian_can_xe)
        else thoi_gian_can_xe
      end,
      updated_at = now()
  where so_don_hang = p_order_id
  returning * into order_row;

  if not wait_mode then
    delete from public.yeucauxhd
    where so_don_hang = p_order_id;
  else
    update public.yeucauxhd
    set vin = null
    where so_don_hang = p_order_id;
  end if;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_id, actor_name, actor_username, detail)
  values (
    'cancel_order',
    order_row.so_don_hang,
    paired_vin,
    actor_id,
    actor_name,
    actor_username,
    coalesce(nullif(p_note, ''), case when wait_mode then 'Hủy ghép & chờ xe' else 'Hủy đơn hàng' end)
  );

  return jsonb_build_object(
    'order_id', order_row.so_don_hang,
    'order_status', order_row.ket_qua,
    'vin_released', paired_vin,
    'mode', case when wait_mode then 'wait' else 'cancel' end
  );
end;
$$;

grant select on public.chinhsach to authenticated;
grant execute on function public.cancel_order_donhang(text, text, text, date, timestamptz) to authenticated;
