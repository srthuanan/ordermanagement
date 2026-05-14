create table if not exists public.vehicle_locations (
  vin text primary key references public.khoxe (vin) on update cascade on delete cascade,
  vi_tri text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicle_locations enable row level security;

drop policy if exists "authenticated can read vehicle_locations" on public.vehicle_locations;
drop policy if exists "admin can manage vehicle_locations" on public.vehicle_locations;

create policy "authenticated can read vehicle_locations"
on public.vehicle_locations
for select
using (auth.role() = 'authenticated');

create policy "admin can manage vehicle_locations"
on public.vehicle_locations
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

insert into public.vehicle_locations (vin, vi_tri, latitude, longitude, created_at, updated_at)
select vin, vi_tri, latitude, longitude, now(), now()
from public.khoxe
on conflict (vin) do update
set vi_tri = excluded.vi_tri,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now();

create index if not exists vehicle_locations_updated_at_idx
  on public.vehicle_locations (updated_at desc);

create index if not exists vehicle_locations_lat_lng_idx
  on public.vehicle_locations (latitude, longitude);

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
  so_may,
  ma_dms,
  latitude,
  longitude
)
values
  ('RLNV5JSE9TH715285', 'VF 5', 'Plus', 'Urbant Mint (CE1W)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RLLV3F5D8TH730486', 'VF 7', 'Eco Tiêu chuẩn 2', 'Zenith Grey (CE1V)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31903', null, null, null),
  ('RLLVFPNT9TH707691', 'LIMO', 'LIMO', 'Jet Black (CE11)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31913', null, null, null),
  ('RLLVAGND5TH738301', 'VF 6', 'Eco Tiêu chuẩn', 'Neptune Grey (CE14)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RLNVMNMS5TT705685', 'MINIO', 'MINIO', 'Brahminy White (CE18)', 'Grey', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RNXVGRPK1TT712494', 'EC Van', 'Plus', 'Crimson Red (CE1M)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RNXVGRUK9TT190086', 'EC Van', 'Base', 'Brahminy White (CE18)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31913', null, null, null),
  ('RLLVFPTT0TH752621', 'VF LIMO', 'MPV 7', 'Brahminy White (CE18)', 'Brown', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RLLV2CVA8TH749546', 'VF 9', 'Eco_3ZONES', 'Jet Black (CE11)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RLLVFPNT8TH753870', 'LIMO', 'LIMO', 'Silver (CE17)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RLLVAGND7TH746030', 'VF 6', 'Eco Tiêu chuẩn', 'Brahminy White (CE18)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31920', null, null, null),
  ('RLNV5JSE2TH750914', 'VF 5', 'Plus', 'Brahminy White (CE18)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31913', null, null, null),
  ('RLLV3F5D7TH759039', 'VF 7', 'Eco_HUD Tiêu chuẩn 2', 'Brahminy White (CE18)', 'Black', 'Chưa ghép', null, null, null, 'Kho xe', now(), current_date, 'N31913', null, null, null)
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
    ma_dms = excluded.ma_dms,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now();

insert into public.vehicle_locations (
  vin,
  vi_tri,
  latitude,
  longitude,
  created_at,
  updated_at
)
select
  vin,
  vi_tri,
  latitude,
  longitude,
  now(),
  now()
from public.khoxe
where vin in (
  'RLNV5JSE9TH715285',
  'RLLV3F5D8TH730486',
  'RLLVFPNT9TH707691',
  'RLLVAGND5TH738301',
  'RLNVMNMS5TT705685',
  'RNXVGRPK1TT712494',
  'RNXVGRUK9TT190086',
  'RLLVFPTT0TH752621',
  'RLLV2CVA8TH749546',
  'RLLVFPNT8TH753870',
  'RLLVAGND7TH746030',
  'RLNV5JSE2TH750914',
  'RLLV3F5D7TH759039'
)
on conflict (vin) do update
set vi_tri = excluded.vi_tri,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now();
