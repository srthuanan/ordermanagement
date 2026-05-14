update public.profiles
set role = 'sales'
where role <> 'admin';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'sales'));

drop policy if exists "authenticated can read customers" on public.customers;
drop policy if exists "sales can manage customers" on public.customers;
create policy "authenticated can read customers"
on public.customers for select
to authenticated
using (true);

create policy "admin and sales can manage customers"
on public.customers for all
to authenticated
using (app_private.current_user_role() in ('admin', 'sales'))
with check (app_private.current_user_role() in ('admin', 'sales'));

drop policy if exists "authenticated can read khoxe" on public.khoxe;
drop policy if exists "warehouse can manage khoxe" on public.khoxe;
create policy "authenticated can read khoxe"
on public.khoxe for select
to authenticated
using (true);

create policy "admin can manage khoxe"
on public.khoxe for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists "authenticated can read donhang" on public.donhang;
drop policy if exists "sales can create donhang" on public.donhang;
drop policy if exists "sales can update donhang" on public.donhang;
create policy "authenticated can read donhang"
on public.donhang for select
to authenticated
using (true);

create policy "admin and sales can create donhang"
on public.donhang for insert
to authenticated
with check (app_private.current_user_role() in ('admin', 'sales'));

create policy "admin and sales can update donhang"
on public.donhang for update
to authenticated
using (app_private.current_user_role() in ('admin', 'sales'))
with check (app_private.current_user_role() in ('admin', 'sales'));

drop policy if exists "admin can read audit logs" on public.audit_logs;
create policy "admin can read audit logs"
on public.audit_logs for select
to authenticated
using (app_private.current_user_role() = 'admin');

drop policy if exists "authenticated can read car_hold_activities" on public.car_hold_activities;
drop policy if exists "staff can insert car_hold_activities" on public.car_hold_activities;
drop policy if exists "staff can update car_hold_activities" on public.car_hold_activities;
drop policy if exists "staff can delete queue rows in car_hold_activities" on public.car_hold_activities;
create policy "authenticated can read car_hold_activities"
on public.car_hold_activities for select
to authenticated
using (true);

create policy "admin can insert car_hold_activities"
on public.car_hold_activities for insert
to authenticated
with check (app_private.current_user_role() = 'admin');

create policy "admin can update car_hold_activities"
on public.car_hold_activities for update
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

create policy "admin can delete queue rows in car_hold_activities"
on public.car_hold_activities for delete
to authenticated
using (app_private.current_user_role() = 'admin');

drop policy if exists "authenticated can read yeucauxhd" on public.yeucauxhd;
drop policy if exists "staff can manage yeucauxhd" on public.yeucauxhd;
create policy "admin can read yeucauxhd"
on public.yeucauxhd for select
to authenticated
using (app_private.current_user_role() = 'admin');

create policy "admin can manage yeucauxhd"
on public.yeucauxhd for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists "authenticated can read chinhsach" on public.chinhsach;
drop policy if exists "managers can manage chinhsach" on public.chinhsach;
create policy "authenticated can read chinhsach"
on public.chinhsach for select
to authenticated
using (true);

create policy "admin can manage chinhsach"
on public.chinhsach for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists "authenticated can read user_reputation_cache" on public.user_reputation_cache;
drop policy if exists "staff can manage user_reputation_cache" on public.user_reputation_cache;
create policy "authenticated can read user_reputation_cache"
on public.user_reputation_cache for select
to authenticated
using (true);

create policy "admin can manage user_reputation_cache"
on public.user_reputation_cache for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists "authenticated can read reputation_adjustments" on public.reputation_adjustments;
drop policy if exists "manager can manage reputation_adjustments" on public.reputation_adjustments;
create policy "authenticated can read reputation_adjustments"
on public.reputation_adjustments for select
to authenticated
using (true);

create policy "admin can manage reputation_adjustments"
on public.reputation_adjustments for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');
