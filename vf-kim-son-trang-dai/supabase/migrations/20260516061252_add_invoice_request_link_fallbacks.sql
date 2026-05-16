alter table public.yeucauxhd
  add column if not exists link_hop_dong text,
  add column if not exists link_hoa_don_da_xuat text;

update public.yeucauxhd
set
  link_hop_dong = coalesce(link_hop_dong, url_hop_dong),
  link_hoa_don_da_xuat = coalesce(link_hoa_don_da_xuat, url_hoa_don_da_xuat)
where link_hop_dong is null
   or link_hoa_don_da_xuat is null;

create or replace function public.complete_issued_invoice(
  p_request_id uuid,
  p_invoice_url text,
  p_mail_status text default 'Chưa gửi mail'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
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
    link_hoa_don_da_xuat = nullif(trim(p_invoice_url), ''),
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
$function$;

create or replace function public.request_invoice_donhang(
  p_order_id text,
  p_link_de_nghi_xhd text,
  p_chinh_sach text,
  p_order_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path to public, app_private
as $function$
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
    link_hop_dong,
    link_hoa_don_da_xuat,
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
    nullif(order_row.link_hop_dong, ''),
    null,
    coalesce(nullif(p_chinh_sach, ''), order_row.chinh_sach),
    'pending'
  )
  returning * into req_row;

  insert into public.car_hold_activities (action, so_don_hang, vin, actor_id, actor_name, actor_username, detail)
  values ('request_invoice', order_row.so_don_hang, order_row.vin, actor_id, actor_name, actor_username, 'Tạo yêu cầu xuất hóa đơn');

  return jsonb_build_object('request_id', req_row.id, 'order_id', order_row.so_don_hang, 'status', req_row.status);
end;
$function$;
