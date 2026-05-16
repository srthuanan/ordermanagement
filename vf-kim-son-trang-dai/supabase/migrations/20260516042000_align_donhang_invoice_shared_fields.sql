alter table public.donhang
  add column if not exists so_tien_khach_da_dong numeric,
  add column if not exists dia_chi text,
  add column if not exists so_hop_dong text,
  add column if not exists ngay_ky_hop_dong date,
  add column if not exists hinh_thuc_tt text,
  add column if not exists nguon_khach text,
  add column if not exists mua_bao_hiem boolean,
  add column if not exists dang_ky_xe boolean,
  add column if not exists xe_xang_vin text,
  add column if not exists xe_xang_hang text,
  add column if not exists xe_xang_model text,
  add column if not exists gia_cong_bo numeric,
  add column if not exists ghi_chu text;

alter table public.yeucauxhd
  add column if not exists ma_vso text;

update public.donhang d
set
  so_tien_khach_da_dong = coalesce(d.so_tien_khach_da_dong, d.so_tien_coc),
  dia_chi = coalesce(d.dia_chi, d.dia_chi_xhd),
  so_hop_dong = coalesce(d.so_hop_dong, d.ma_hop_dong),
  ngay_ky_hop_dong = coalesce(d.ngay_ky_hop_dong, d.ngay_coc::date, d.thoi_gian_nhap::date),
  hinh_thuc_tt = coalesce(d.hinh_thuc_tt, d.tm_vay),
  nguon_khach = coalesce(d.nguon_khach, null),
  mua_bao_hiem = coalesce(d.mua_bao_hiem, null),
  dang_ky_xe = coalesce(d.dang_ky_xe, null),
  xe_xang_vin = coalesce(d.xe_xang_vin, null),
  xe_xang_hang = coalesce(d.xe_xang_hang, null),
  xe_xang_model = coalesce(d.xe_xang_model, null),
  gia_cong_bo = coalesce(d.gia_cong_bo, null),
  ghi_chu = coalesce(d.ghi_chu, null),
  updated_at = now()
where
  d.so_tien_khach_da_dong is null
  or d.dia_chi is null
  or d.so_hop_dong is null
  or d.ngay_ky_hop_dong is null
  or d.hinh_thuc_tt is null;
