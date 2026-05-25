-- Add ma_dms to donhang to match khoxe
ALTER TABLE public.donhang ADD COLUMN IF NOT EXISTS ma_dms text;

-- Recreate trigger function to sync ma_dms
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
