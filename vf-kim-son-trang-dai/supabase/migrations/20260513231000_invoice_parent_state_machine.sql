-- Parent-like invoice workflow states, without yeucauvc dependencies.

alter table public.yeucauxhd
  add column if not exists trang_thai_xu_ly text,
  add column if not exists ghi_chu_admin text;

update public.yeucauxhd y
set trang_thai_xu_ly = coalesce(
  y.trang_thai_xu_ly,
  case
    when d.ket_qua in ('Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn') then d.ket_qua
    when y.status = 'approved' then 'Đã phê duyệt'
    else 'Chờ phê duyệt'
  end
)
from public.donhang d
where d.so_don_hang = y.so_don_hang;

create or replace function public.approve_invoice_request(
  p_request_id uuid
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
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role not in ('admin', 'manager', 'delivery') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền phê duyệt yêu cầu xuất hóa đơn.');
  end if;

  select * into req_row from public.yeucauxhd where id = p_request_id for update;
  if req_row.id is null then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy yêu cầu xuất hóa đơn.');
  end if;

  update public.yeucauxhd
  set
    status = 'approved',
    trang_thai_xu_ly = 'Đã phê duyệt',
    approved_by = actor.id,
    approved_by_name = actor.full_name,
    approved_by_username = actor.id::text,
    note = 'Đã phê duyệt',
    updated_at = now()
  where id = p_request_id;

  update public.donhang
  set ket_qua = 'Đã phê duyệt',
      updated_at = now()
  where so_don_hang = req_row.so_don_hang;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_name, actor_username, detail)
  values ('finalize_invoice', req_row.so_don_hang, req_row.vin, actor.full_name, actor.id::text, 'Phê duyệt yêu cầu xuất hóa đơn');

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Đã phê duyệt yêu cầu xuất hóa đơn.');
end;
$$;

create or replace function public.request_invoice_supplement(
  p_request_id uuid,
  p_reason text
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
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role not in ('admin', 'manager', 'delivery') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền yêu cầu bổ sung hồ sơ.');
  end if;

  select * into req_row from public.yeucauxhd where id = p_request_id for update;
  if req_row.id is null then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy yêu cầu xuất hóa đơn.');
  end if;

  update public.yeucauxhd
  set
    status = 'pending',
    trang_thai_xu_ly = 'Yêu cầu bổ sung',
    ghi_chu_admin = nullif(trim(p_reason), ''),
    note = 'Yêu cầu bổ sung',
    updated_at = now()
  where id = p_request_id;

  update public.donhang
  set ket_qua = 'Yêu cầu bổ sung',
      updated_at = now()
  where so_don_hang = req_row.so_don_hang;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_name, actor_username, detail)
  values ('request_invoice', req_row.so_don_hang, req_row.vin, actor.full_name, actor.id::text, 'Yêu cầu bổ sung hồ sơ: ' || coalesce(p_reason, ''));

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Đã gửi yêu cầu bổ sung hồ sơ.');
end;
$$;

create or replace function public.mark_invoice_pending_signature(
  p_request_id uuid,
  p_ngay_xuat_hoa_don date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req_row public.yeucauxhd;
  actor public.profiles;
  invoice_date date;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role not in ('admin', 'manager', 'delivery') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền chuyển chờ ký hóa đơn.');
  end if;

  select * into req_row from public.yeucauxhd where id = p_request_id for update;
  if req_row.id is null then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy yêu cầu xuất hóa đơn.');
  end if;

  invoice_date := coalesce(p_ngay_xuat_hoa_don, current_date);

  update public.yeucauxhd
  set
    trang_thai_xu_ly = 'Chờ ký hóa đơn',
    ngay_xuat_hoa_don = invoice_date,
    note = 'Chờ ký hóa đơn',
    updated_at = now()
  where id = p_request_id;

  update public.donhang
  set ket_qua = 'Chờ ký hóa đơn',
      ngay_xuat_hoa_don = invoice_date,
      updated_at = now()
  where so_don_hang = req_row.so_don_hang;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_name, actor_username, detail)
  values ('finalize_invoice', req_row.so_don_hang, req_row.vin, actor.full_name, actor.id::text, 'Chuyển chờ ký hóa đơn');

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Đã chuyển sang Chờ ký hóa đơn.');
end;
$$;

create or replace function public.complete_issued_invoice(
  p_request_id uuid,
  p_invoice_url text,
  p_mail_status text default 'Chưa gửi mail'
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
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role not in ('admin', 'manager', 'delivery') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền tải hóa đơn đã xuất.');
  end if;

  select * into req_row from public.yeucauxhd where id = p_request_id for update;
  if req_row.id is null then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy yêu cầu xuất hóa đơn.');
  end if;

  update public.yeucauxhd
  set
    status = 'approved',
    trang_thai_xu_ly = 'Đã xuất hóa đơn',
    url_hoa_don_da_xuat = nullif(trim(p_invoice_url), ''),
    ket_qua_gui_mail = coalesce(nullif(trim(p_mail_status), ''), 'Chưa gửi mail'),
    ngay_xuat_hoa_don = coalesce(ngay_xuat_hoa_don, current_date),
    note = 'Đã xuất hóa đơn',
    updated_at = now()
  where id = p_request_id;

  update public.donhang
  set ket_qua = 'Đã xuất hóa đơn',
      link_hoa_don_da_xuat = nullif(trim(p_invoice_url), ''),
      trang_thai_gui_mail = coalesce(nullif(trim(p_mail_status), ''), 'Chưa gửi mail'),
      ngay_xuat_hoa_don = coalesce(ngay_xuat_hoa_don, current_date),
      updated_at = now()
  where so_don_hang = req_row.so_don_hang;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_name, actor_username, detail)
  values ('finalize_invoice', req_row.so_don_hang, req_row.vin, actor.full_name, actor.id::text, 'Tải hóa đơn đã xuất');

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Đã hoàn tất xuất hóa đơn.');
end;
$$;

grant execute on function public.approve_invoice_request(uuid) to authenticated;
grant execute on function public.request_invoice_supplement(uuid, text) to authenticated;
grant execute on function public.mark_invoice_pending_signature(uuid, date) to authenticated;
grant execute on function public.complete_issued_invoice(uuid, text, text) to authenticated;
