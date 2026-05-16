create or replace function public.sync_donhang_vehicle_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  vehicle_row public.khoxe;
begin
  if coalesce(new.vin, '') = '' then
    new.so_may := null;
    return new;
  end if;

  select * into vehicle_row
  from public.khoxe
  where vin = new.vin
  limit 1;

  if found then
    new.so_may := vehicle_row.so_may;
  end if;

  return new;
end;
$function$;
