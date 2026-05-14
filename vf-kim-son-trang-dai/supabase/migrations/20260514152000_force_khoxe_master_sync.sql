-- Force khoxe to always take master inventory fields from thongtinxe
-- This keeps dòng xe / phiên bản / ngoại thất / nội thất / số máy / mã DMS aligned
-- with the parent-project master table instead of any manual local edits.

create or replace function public.sync_khoxe_with_master()
returns trigger
language plpgsql
security definer
as $$
declare
  master_record record;
begin
  select *
  into master_record
  from public.thongtinxe
  where vin = new.vin
  limit 1;

  if master_record is not null then
    if master_record.mo_ta is not null and lower(master_record.mo_ta) like '%limo green%' then
      new.dong_xe := 'LIMO';
    else
      new.dong_xe := coalesce(nullif(trim(master_record.mo_ta), ''), new.dong_xe);
    end if;

    new.phien_ban := coalesce(nullif(trim(master_record.phien_ban), ''), new.phien_ban);
    new.ngoai_that := coalesce(nullif(trim(master_record.ngoai_that), ''), new.ngoai_that);
    new.noi_that := coalesce(nullif(trim(master_record.noi_that), ''), new.noi_that);
    new.so_may := coalesce(nullif(trim(master_record.so_may), ''), new.so_may);
    new.ma_dms := coalesce(nullif(trim(master_record.khu_vuc), ''), new.ma_dms);
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_sync_khoxe_with_master on public.khoxe;
create trigger trigger_sync_khoxe_with_master
before insert or update on public.khoxe
for each row
execute function public.sync_khoxe_with_master();

update public.khoxe k
set
  dong_xe = coalesce(nullif(trim(t.mo_ta), ''), k.dong_xe),
  phien_ban = coalesce(nullif(trim(t.phien_ban), ''), k.phien_ban),
  ngoai_that = coalesce(nullif(trim(t.ngoai_that), ''), k.ngoai_that),
  noi_that = coalesce(nullif(trim(t.noi_that), ''), k.noi_that),
  so_may = coalesce(nullif(trim(t.so_may), ''), k.so_may),
  ma_dms = coalesce(nullif(trim(t.khu_vuc), ''), k.ma_dms)
from public.thongtinxe t
where t.vin = k.vin;
