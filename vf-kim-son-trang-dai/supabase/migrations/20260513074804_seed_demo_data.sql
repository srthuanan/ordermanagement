insert into public.customers (full_name, phone, area)
values
  ('Nguyễn Minh Châu', '0908 245 118', 'Trảng Dài'),
  ('Trần Quốc Bảo', '0919 650 332', 'Biên Hòa'),
  ('Lê Thị Ngọc', '0973 884 601', 'Long Bình'),
  ('Phạm Anh Tuấn', '0936 112 740', 'Hố Nai'),
  ('Đỗ Minh Hằng', '0982 219 778', 'Tân Phong')
on conflict (phone) do update
set full_name = excluded.full_name,
    area = excluded.area;

insert into public.khoxe (
  vin,
  dong_xe,
  phien_ban,
  ngoai_that,
  noi_that,
  trang_thai,
  nguoi_giu_xe,
  username_giu_xe,
  thoi_gian_het_han_giu,
  vi_tri,
  ngay_nhap,
  ngay_van_tai,
  so_may
)
values
  ('RLLVFAAA001', 'VF 5', 'VF 5 Plus', 'Xanh Neptune', 'Đen', 'Đã ghép', 'Kim Anh', 'kim.anh', 'Vô thời hạn', 'Bãi A1', '2026-05-01 08:00:00+07', '2026-05-03', 'SM001'),
  ('RLLVFAAA002', 'VF 6', 'VF 6 Eco', 'Trắng Brahminy', 'Đen', 'Đang giữ', 'Hải Đăng', 'hai.dang', '14/05/2026 18:00:00', 'Bãi A2', '2026-05-04 09:30:00+07', '2026-05-05', 'SM002'),
  ('RLLVFAAA003', 'VF 6', 'VF 6 Eco', 'Trắng Brahminy', 'Đen', 'Chưa ghép', null, null, null, 'Bãi A3', '2026-05-06 10:10:00+07', '2026-05-06', 'SM003'),
  ('RLLVFAAA004', 'VF 7', 'VF 7 Plus', 'Đỏ Crimson', 'Đen', 'Chưa ghép', null, null, null, 'Bãi B1', '2026-05-07 11:00:00+07', '2026-05-08', 'SM004'),
  ('RLLVFAAA005', 'VF 3', 'VF 3', 'Vàng Summer', 'Đen', 'Đã ghép', 'Thanh Phúc', 'thanh.phuc', 'Vô thời hạn', 'Bãi C1', '2026-05-02 13:20:00+07', '2026-05-02', 'SM005'),
  ('RLLVFAAA006', 'VF 8', 'VF 8 Lux', 'Đen Jet', 'Nâu', 'Chưa ghép', null, null, null, 'Bãi D1', '2026-05-03 15:00:00+07', '2026-05-04', 'SM006')
on conflict (vin) do update
set dong_xe = excluded.dong_xe,
    phien_ban = excluded.phien_ban,
    ngoai_that = excluded.ngoai_that,
    noi_that = excluded.noi_that,
    trang_thai = excluded.trang_thai,
    nguoi_giu_xe = excluded.nguoi_giu_xe,
    username_giu_xe = excluded.username_giu_xe,
    thoi_gian_het_han_giu = excluded.thoi_gian_het_han_giu,
    vi_tri = excluded.vi_tri,
    ngay_nhap = excluded.ngay_nhap,
    ngay_van_tai = excluded.ngay_van_tai,
    so_may = excluded.so_may,
    updated_at = now();

insert into public.donhang (
  so_don_hang,
  ten_tu_van_ban_hang,
  ten_khach_hang,
  dong_xe,
  phien_ban,
  ngoai_that,
  noi_that,
  ngay_coc,
  thoi_gian_can_xe,
  thoi_gian_nhap,
  ket_qua,
  vin,
  thoi_gian_ghep,
  chinh_sach
)
values
  ('VF-260513-001', 'Kim Anh', 'Nguyễn Minh Châu', 'VF 5', 'VF 5 Plus', 'Xanh Neptune', 'Đen', '2026-05-13', '2026-05-18', '2026-05-13 09:12:00+07', 'Đã ghép', 'RLLVFAAA001', '2026-05-13 09:45:00+07', 'Ưu đãi tháng 5'),
  ('VF-260513-002', 'Hải Đăng', 'Trần Quốc Bảo', 'VF 6', 'VF 6 Eco', 'Trắng Brahminy', 'Đen', '2026-05-13', '2026-05-20', '2026-05-13 10:34:00+07', 'Chưa ghép', null, null, null),
  ('VF-260512-009', 'Kim Anh', 'Lê Thị Ngọc', 'VF 7', 'VF 7 Plus', 'Đỏ Crimson', 'Đen', '2026-05-12', '2026-05-15', '2026-05-12 16:45:00+07', 'Đã xuất hóa đơn', 'RLLVFAAA004', '2026-05-12 17:20:00+07', 'Ưu đãi đổi xe'),
  ('VF-260511-014', 'Thanh Phúc', 'Phạm Anh Tuấn', 'VF 3', 'VF 3', 'Vàng Summer', 'Đen', '2026-05-11', '2026-05-19', '2026-05-11 14:05:00+07', 'Đã ghép', 'RLLVFAAA005', '2026-05-11 15:00:00+07', null),
  ('VF-260510-021', 'Hải Đăng', 'Đỗ Minh Hằng', 'VF 8', 'VF 8 Lux', 'Đen Jet', 'Nâu', '2026-05-10', '2026-05-22', '2026-05-10 11:20:00+07', 'Đã hủy', null, null, null)
on conflict (so_don_hang) do update
set ten_tu_van_ban_hang = excluded.ten_tu_van_ban_hang,
    ten_khach_hang = excluded.ten_khach_hang,
    dong_xe = excluded.dong_xe,
    phien_ban = excluded.phien_ban,
    ngoai_that = excluded.ngoai_that,
    noi_that = excluded.noi_that,
    ngay_coc = excluded.ngay_coc,
    thoi_gian_can_xe = excluded.thoi_gian_can_xe,
    thoi_gian_nhap = excluded.thoi_gian_nhap,
    ket_qua = excluded.ket_qua,
    vin = excluded.vin,
    thoi_gian_ghep = excluded.thoi_gian_ghep,
    chinh_sach = excluded.chinh_sach,
    updated_at = now();
