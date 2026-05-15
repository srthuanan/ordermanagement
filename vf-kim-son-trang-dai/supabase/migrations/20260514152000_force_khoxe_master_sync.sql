create or replace function public.sync_khoxe_with_master()
returns trigger
language plpgsql
security definer
as $$
begin
  return new;
end;
$$;

drop trigger if exists trigger_sync_khoxe_with_master on public.khoxe;
create trigger trigger_sync_khoxe_with_master
before insert or update on public.khoxe
for each row
execute function public.sync_khoxe_with_master();
