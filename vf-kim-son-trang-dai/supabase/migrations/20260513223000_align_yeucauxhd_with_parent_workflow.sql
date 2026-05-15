-- Align invoice request inbox with parent project, without yeucauvc/trang_thai_vc fields.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'donhang'
      and kcu.column_name = 'vin'
      and ccu.table_name = 'khoxe'
  loop
    execute format('alter table public.donhang drop constraint if exists %I', constraint_name);
  end loop;

  for constraint_name in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'yeucauxhd'
      and kcu.column_name = 'vin'
      and ccu.table_name = 'khoxe'
  loop
    execute format('alter table public.yeucauxhd drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.yeucauxhd
  add column if not exists tvbh text,
  add column if not exists dong_xe text,
  add column if not exists phien_ban text,
  add column if not exists ngoai_that text,
  add column if not exists noi_that text,
  add column if not exists ngay_coc date,
  add column if not exists ngay_yeu_cau timestamptz,
  add column if not exists hoa_hong_ung text,
  add column if not exists vpoint text,
  add column if not exists url_hop_dong text,
  add column if not exists url_de_nghi_xhd text,
  add column if not exists url_hoa_don_da_xuat text,
  add column if not exists so_may text,
  add column if not exists ngay_xuat_hoa_don date,
  add column if not exists ket_qua_gui_mail text,
  add column if not exists ghi_chu_ai text,
  add column if not exists xe_xang_vin text,
  add column if not exists xe_xang_hang text,
  add column if not exists xe_xang_model text;

update public.yeucauxhd
set
  ngay_yeu_cau = coalesce(ngay_yeu_cau, created_at),
  url_de_nghi_xhd = coalesce(url_de_nghi_xhd, link_de_nghi_xhd),
  tvbh = coalesce(tvbh, requested_by_name),
  updated_at = now()
where ngay_yeu_cau is null
   or url_de_nghi_xhd is null
   or tvbh is null;

create index if not exists yeucauxhd_ngay_yeu_cau_idx
on public.yeucauxhd (ngay_yeu_cau desc);

create index if not exists yeucauxhd_vin_idx
on public.yeucauxhd (vin);

create index if not exists yeucauxhd_xe_xang_vin_idx
on public.yeucauxhd (xe_xang_vin)
where xe_xang_vin is not null and xe_xang_vin <> '';

drop function if exists public.finalize_invoice_donhang(uuid, text, text);
drop function if exists public.finalize_invoice_donhang(uuid, text, text, text);

create or replace function public.finalize_invoice_donhang(
  p_request_id uuid,
  p_link_hoa_don_da_xuat text,
  p_link_hop_dong text,
  p_mail_status text default 'Đã gửi'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req_row public.yeucauxhd;
  actor public.profiles;
begin
  select *
  into actor
  from public.profiles
  where id = auth.uid();

  if actor.id is null or actor.role not in ('admin', 'manager', 'delivery') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền phê duyệt xuất hóa đơn.');
  end if;

  select *
  into req_row
  from public.yeucauxhd
  where id = p_request_id
  for update;

  if req_row.id is null then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy yêu cầu xuất hóa đơn.');
  end if;

  if req_row.status = 'approved' then
    return jsonb_build_object('status', 'ERROR', 'message', 'Yêu cầu này đã được phê duyệt.');
  end if;

  update public.yeucauxhd
  set
    status = 'approved',
    approved_by = actor.id,
    approved_by_name = actor.full_name,
    approved_by_username = actor.id::text,
    note = 'Đã xuất hóa đơn',
    url_hoa_don_da_xuat = nullif(trim(p_link_hoa_don_da_xuat), ''),
    url_hop_dong = coalesce(nullif(trim(p_link_hop_dong), ''), url_hop_dong),
    ngay_xuat_hoa_don = current_date,
    ket_qua_gui_mail = coalesce(nullif(trim(p_mail_status), ''), 'Đã gửi'),
    updated_at = now()
  where id = p_request_id;

  update public.donhang
  set
    ket_qua = 'Đã xuất hóa đơn',
    trang_thai_gui_mail = coalesce(nullif(trim(p_mail_status), ''), 'Đã gửi'),
    link_hoa_don_da_xuat = nullif(trim(p_link_hoa_don_da_xuat), ''),
    link_hop_dong = coalesce(nullif(trim(p_link_hop_dong), ''), link_hop_dong),
    ngay_xuat_hoa_don = current_date,
    updated_at = now()
  where so_don_hang = req_row.so_don_hang;

  insert into public.car_hold_activities (
    action,
    so_don_hang,
    vin,
    actor_name,
    actor_username,
    detail
  )
  values (
    'finalize_invoice',
    req_row.so_don_hang,
    req_row.vin,
    actor.full_name,
    actor.id::text,
    'Phê duyệt xuất hóa đơn: ' || coalesce(p_link_hoa_don_da_xuat, '')
  );

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Đã phê duyệt xuất hóa đơn.');
end;
$$;

grant execute on function public.finalize_invoice_donhang(uuid, text, text, text) to authenticated;
grant select, insert, update on public.yeucauxhd to authenticated;
