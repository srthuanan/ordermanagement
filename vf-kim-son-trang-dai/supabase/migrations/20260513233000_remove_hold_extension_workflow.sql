create or replace function public.expire_khoxe_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
begin
  with expired_rows as (
    update public.khoxe
    set trang_thai = 'Chưa ghép',
        nguoi_giu_xe = null,
        username_giu_xe = null,
        thoi_gian_het_han_giu = null,
        hold_until = null,
        is_extension_requested = false,
        extension_reason = null,
        extension_evidence_url = null,
        updated_at = now()
    where trang_thai = 'Đang giữ'
      and hold_until is not null
      and hold_until <= now()
    returning vin
  )
  insert into public.car_hold_activities (action, vin, detail)
  select 'expire_hold', vin, 'Auto release expired hold'
  from expired_rows;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'khoxe-auto-release-expired-holds';

select cron.schedule(
  'khoxe-auto-release-expired-holds',
  '* * * * *',
  $$select public.expire_khoxe_holds();$$
);

update public.khoxe
set is_extension_requested = false,
    extension_reason = null,
    extension_evidence_url = null
where trang_thai <> 'Đang giữ'
   or hold_until is null
   or hold_until <= now();

grant execute on function public.expire_khoxe_holds() to authenticated;
