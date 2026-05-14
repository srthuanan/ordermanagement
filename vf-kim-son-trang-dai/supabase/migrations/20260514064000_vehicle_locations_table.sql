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
