delete from public.chinhsach
where ten_chinh_sach not in (
  'Ưu đãi giao xe tháng hiện hành',
  'Hỗ trợ lãi suất ngân hàng',
  'Thu cũ đổi mới xe điện'
);

insert into public.chinhsach (
  ten_chinh_sach,
  dong_xe,
  han_su_dung,
  trang_thai
)
values
  ('Ưu đãi giao xe tháng hiện hành', 'Tất cả', null, 'Hoạt động'),
  ('Hỗ trợ lãi suất ngân hàng', 'VF 5,VF 6,VF 7,VF 8,VF 9', null, 'Hoạt động'),
  ('Thu cũ đổi mới xe điện', 'VF 6,VF 7,VF 8,VF 9', null, 'Hoạt động')
on conflict (ten_chinh_sach) do update
set dong_xe = excluded.dong_xe,
    han_su_dung = excluded.han_su_dung,
    trang_thai = excluded.trang_thai,
    updated_at = now();
