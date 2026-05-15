alter table public.yeucauxhd
  add column if not exists so_tien_khach_da_dong numeric,
  add column if not exists dia_chi text,
  add column if not exists so_hop_dong text,
  add column if not exists ngay_ky_hop_dong date,
  add column if not exists hinh_thuc_tt text,
  add column if not exists nguon_khach text,
  add column if not exists ma_vso text,
  add column if not exists mua_bao_hiem boolean,
  add column if not exists dang_ky_xe boolean,
  add column if not exists gia_cong_bo numeric,
  add column if not exists ghi_chu text,
  add column if not exists coc boolean;

update public.yeucauxhd y
set
  so_tien_khach_da_dong = coalesce(y.so_tien_khach_da_dong, d.so_tien_coc),
  dia_chi = coalesce(y.dia_chi, d.dia_chi_xhd),
  so_hop_dong = coalesce(y.so_hop_dong, d.ma_hop_dong),
  ngay_ky_hop_dong = coalesce(y.ngay_ky_hop_dong, d.thoi_gian_nhap::date, d.ngay_coc),
  hinh_thuc_tt = coalesce(y.hinh_thuc_tt, d.tm_vay),
  coc = coalesce(y.coc, d.so_tien_coc is not null or d.ngay_coc is not null),
  updated_at = now()
from public.donhang d
where d.so_don_hang = y.so_don_hang;
