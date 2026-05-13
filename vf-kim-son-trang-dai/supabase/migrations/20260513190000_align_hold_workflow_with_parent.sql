alter table public.car_hold_activities
  add column if not exists username text,
  add column if not exists tvbh_name text,
  add column if not exists type text default 'HOLD',
  add column if not exists status text default 'active',
  add column if not exists reason text,
  add column if not exists updated_at timestamptz default now();

update public.car_hold_activities
set username = coalesce(username, actor_username),
    tvbh_name = coalesce(tvbh_name, actor_name),
    type = coalesce(type, 'HOLD'),
    status = coalesce(status, 'active'),
    updated_at = coalesce(updated_at, created_at, now())
where username is null
   or tvbh_name is null
   or type is null
   or status is null
   or updated_at is null;

alter table public.car_hold_activities
  drop constraint if exists car_hold_activities_action_check;

alter table public.car_hold_activities
  add constraint car_hold_activities_action_check
  check (
    action in (
      'hold',
      'release',
      'pair',
      'unpair',
      'expire_hold',
      'request_invoice',
      'finalize_invoice',
      'cancel_order',
      'queue_join',
      'queue_leave',
      'queue_prioritized'
    )
  );

create table if not exists public.user_reputation_cache (
  username text primary key,
  score integer not null default 100,
  total_holds integer not null default 0,
  matched_holds integer not null default 0,
  is_champion boolean not null default false,
  last_updated timestamptz not null default now()
);

create table if not exists public.reputation_adjustments (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  adjustment_value integer not null default 0,
  reason text,
  updated_at timestamptz not null default now()
);

alter table public.user_reputation_cache enable row level security;
alter table public.reputation_adjustments enable row level security;

drop policy if exists "authenticated can read user_reputation_cache" on public.user_reputation_cache;
drop policy if exists "staff can manage user_reputation_cache" on public.user_reputation_cache;
drop policy if exists "authenticated can read reputation_adjustments" on public.reputation_adjustments;
drop policy if exists "manager can manage reputation_adjustments" on public.reputation_adjustments;

create policy "authenticated can read user_reputation_cache"
on public.user_reputation_cache for select
to authenticated
using (true);

create policy "staff can manage user_reputation_cache"
on public.user_reputation_cache for all
to authenticated
using (app_private.current_user_role() in ('admin', 'manager'))
with check (app_private.current_user_role() in ('admin', 'manager'));

create policy "authenticated can read reputation_adjustments"
on public.reputation_adjustments for select
to authenticated
using (true);

create policy "manager can manage reputation_adjustments"
on public.reputation_adjustments for all
to authenticated
using (app_private.current_user_role() in ('admin', 'manager'))
with check (app_private.current_user_role() in ('admin', 'manager'));

drop policy if exists "staff can update car_hold_activities" on public.car_hold_activities;
drop policy if exists "staff can delete queue rows in car_hold_activities" on public.car_hold_activities;

create policy "staff can update car_hold_activities"
on public.car_hold_activities for update
to authenticated
using (app_private.current_user_role() in ('admin', 'manager', 'warehouse', 'sales', 'delivery'))
with check (app_private.current_user_role() in ('admin', 'manager', 'warehouse', 'sales', 'delivery'));

create policy "staff can delete queue rows in car_hold_activities"
on public.car_hold_activities for delete
to authenticated
using (
  app_private.current_user_role() in ('admin', 'manager', 'warehouse')
  or (
    type = 'QUEUE'
    and username = coalesce(auth.jwt() ->> 'email', auth.uid()::text)
  )
);

create or replace function public.calculate_user_reputation(p_username text)
returns table (
  score integer,
  total_holds integer,
  matched_holds integer,
  is_champion boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer := 100;
  v_total integer := 0;
  v_matched integer := 0;
  v_is_champion boolean := false;
  v_adjust integer := 0;
begin
  select count(*)::int into v_total
  from public.car_hold_activities
  where username = p_username
    and type = 'HOLD'
    and created_at >= date_trunc('month', now());

  select count(*)::int into v_matched
  from public.car_hold_activities
  where username = p_username
    and type = 'HOLD'
    and status in ('matched', 'invoiced')
    and created_at >= date_trunc('month', now());

  v_score := v_score
    + (v_matched * 8)
    - (
      select count(*)::int
      from public.car_hold_activities
      where username = p_username
        and type = 'HOLD'
        and status in ('released', 'expired', 'order_cancelled', 'extension_rejected')
        and created_at >= date_trunc('month', now())
    ) * 3;

  select coalesce(sum(adjustment_value), 0)::int into v_adjust
  from public.reputation_adjustments
  where username = p_username
    and updated_at >= date_trunc('month', now());

  v_score := v_score + v_adjust;

  if v_score < 0 then
    v_score := 0;
  elsif v_score > 100 then
    v_score := 100;
  end if;

  select exists(
    select 1
    from public.reputation_adjustments
    where username = 'CHAMPION_' || to_char(now() - interval '1 month', 'YYYY-MM')
      and reason = p_username
  ) into v_is_champion;

  return query select v_score, v_total, v_matched, v_is_champion;
end;
$$;

create or replace function public.refresh_user_reputation(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_reputation_cache (username, score, total_holds, matched_holds, is_champion, last_updated)
  select p_username, score, total_holds, matched_holds, is_champion, now()
  from public.calculate_user_reputation(p_username)
  on conflict (username) do update set
    score = excluded.score,
    total_holds = excluded.total_holds,
    matched_holds = excluded.matched_holds,
    is_champion = excluded.is_champion,
    last_updated = excluded.last_updated;
end;
$$;

create or replace function public.refresh_user_reputation_from_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    if new.username is not null and new.username <> '' then
      perform public.refresh_user_reputation(new.username);
    end if;
  elsif tg_op = 'DELETE' then
    if old.username is not null and old.username <> '' then
      perform public.refresh_user_reputation(old.username);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_refresh_reputation_on_activity on public.car_hold_activities;
create trigger tr_refresh_reputation_on_activity
after insert or update or delete on public.car_hold_activities
for each row execute function public.refresh_user_reputation_from_activity();

create or replace function public.max_hold_from_score(p_score integer, p_is_champion boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer := 0;
begin
  if p_score >= 85 then
    v_max := 5;
  elsif p_score >= 65 then
    v_max := 4;
  elsif p_score >= 40 then
    v_max := 3;
  elsif p_score >= 15 then
    v_max := 2;
  elsif p_score > 0 then
    v_max := 1;
  else
    v_max := 0;
  end if;

  if p_is_champion and v_max > 0 then
    v_max := v_max + 1;
  end if;

  return v_max;
end;
$$;

create or replace function public.cleanup_expired_queue_priorities()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  cleaned integer := 0;
begin
  update public.car_hold_activities
  set status = 'waiting',
      action = 'queue_join',
      detail = 'Hết hạn ưu tiên, quay lại hàng chờ',
      updated_at = now()
  where type = 'QUEUE'
    and status = 'prioritized'
    and updated_at < now() - interval '15 minutes';

  get diagnostics cleaned = row_count;
  return cleaned;
end;
$$;

create or replace function public.rpc_join_hold_queue(
  p_vin text,
  p_username text,
  p_full_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  v_exists boolean := false;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales', 'delivery') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền thao tác hàng chờ.');
  end if;

  perform public.cleanup_expired_queue_priorities();

  select exists(
    select 1
    from public.car_hold_activities
    where vin = p_vin
      and username = p_username
      and type = 'QUEUE'
      and status in ('waiting', 'notified', 'prioritized')
  ) into v_exists;

  if v_exists then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn đã ở trong hàng chờ của xe này.');
  end if;

  insert into public.car_hold_activities (
    action, vin, username, tvbh_name,
    actor_name, actor_username,
    type, status, detail, created_at, updated_at
  )
  values (
    'queue_join', p_vin, p_username, p_full_name,
    p_full_name, p_username,
    'QUEUE', 'waiting', 'Tham gia hàng chờ', now(), now()
  );

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Bạn đã gia nhập hàng chờ thành công.');
end;
$$;

create or replace function public.rpc_leave_hold_queue(
  p_vin text,
  p_username text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales', 'delivery') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền thao tác hàng chờ.');
  end if;

  update public.car_hold_activities
  set action = 'queue_leave',
      status = 'left',
      detail = 'Hủy đăng ký hàng chờ',
      updated_at = now()
  where id = (
    select id
    from public.car_hold_activities
    where vin = p_vin
      and username = p_username
      and type = 'QUEUE'
      and status in ('waiting', 'notified', 'prioritized')
    order by created_at desc
    limit 1
  );

  if not found then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy đăng ký hàng chờ để hủy.');
  end if;

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Đã hủy chờ xe thành công.');
end;
$$;

create or replace function public.rpc_get_my_queued_vins(p_username text)
returns table(vin text)
language sql
security invoker
set search_path = public
as $$
  select distinct q.vin
  from public.car_hold_activities q
  where q.username = p_username
    and q.type = 'QUEUE'
    and q.status in ('waiting', 'notified', 'prioritized')
$$;

create or replace function public.rpc_hold_car(
  p_vin text,
  p_username text,
  p_full_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  v_car_status text;
  v_current_count integer := 0;
  v_reputation_score integer := 100;
  v_is_champion boolean := false;
  v_max_holds integer := 5;
  v_recent_release_diff_hours numeric;
  v_global_cooldown_minutes numeric;
  v_spam_count integer := 0;
  v_priority_user text;
  v_priority_expiry timestamptz;
  v_past_hold_count integer := 0;
  v_hold_hours integer := 24;
  v_hold_exp_date timestamptz;
  v_hold_exp_str text;
begin
  if actor_role not in ('admin', 'manager', 'warehouse', 'sales') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không có quyền giữ xe.');
  end if;

  perform public.cleanup_expired_queue_priorities();

  select trang_thai
  into v_car_status
  from public.khoxe
  where vin = p_vin
  for update;

  if v_car_status is null then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không tìm thấy thông tin xe trong hệ thống.');
  end if;

  if v_car_status <> 'Chưa ghép' then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không thể giữ xe. Trạng thái hiện tại: ' || v_car_status);
  end if;

  if actor_role <> 'admin' then
    select score, is_champion
    into v_reputation_score, v_is_champion
    from public.user_reputation_cache
    where username = p_username;

    if v_reputation_score is null then
      perform public.refresh_user_reputation(p_username);
      select score, is_champion
      into v_reputation_score, v_is_champion
      from public.user_reputation_cache
      where username = p_username;
    end if;

    v_reputation_score := coalesce(v_reputation_score, 100);
    v_is_champion := coalesce(v_is_champion, false);
    v_max_holds := public.max_hold_from_score(v_reputation_score, v_is_champion);

    select count(*)
    into v_current_count
    from public.khoxe
    where username_giu_xe = p_username
      and trang_thai = 'Đang giữ';

    if v_current_count >= v_max_holds then
      if v_max_holds = 0 then
        return jsonb_build_object('status', 'ERROR', 'message', 'Tài khoản bị khóa chức năng giữ xe do uy tín quá thấp (' || v_reputation_score || '%).');
      else
        return jsonb_build_object('status', 'ERROR', 'message', 'Giới hạn giữ xe hiện tại: tối đa ' || v_max_holds || ' xe.');
      end if;
    end if;

    select extract(epoch from (now() - updated_at)) / 3600
    into v_recent_release_diff_hours
    from public.car_hold_activities
    where vin = p_vin
      and username = p_username
      and type = 'HOLD'
      and status in ('released', 'expired')
    order by updated_at desc
    limit 1;

    if v_recent_release_diff_hours is not null and v_recent_release_diff_hours < 2 then
      return jsonb_build_object('status', 'ERROR', 'message', 'Bạn vừa giải phóng xe này. Vui lòng đợi thêm trước khi giữ lại.');
    end if;

    select extract(epoch from (now() - updated_at)) / 60
    into v_global_cooldown_minutes
    from public.car_hold_activities
    where vin = p_vin
      and type = 'HOLD'
      and status in ('released', 'expired')
      and extract(epoch from (updated_at - created_at)) / 3600 > 6
    order by updated_at desc
    limit 1;

    if v_global_cooldown_minutes is not null and v_global_cooldown_minutes < 15 then
      return jsonb_build_object('status', 'ERROR', 'message', 'Xe vừa được giải phóng sau thời gian dài bị chiếm dụng. Vui lòng đợi thêm ít phút.');
    end if;

    select count(*)
    into v_spam_count
    from public.car_hold_activities
    where username = p_username
      and type = 'HOLD'
      and status in ('released', 'expired')
      and updated_at >= now() - interval '10 minutes';

    if v_spam_count >= 5 then
      return jsonb_build_object('status', 'SPAM_BLOCK', 'message', 'Phát hiện hành vi giữ/nhả xe quá nhanh. Tạm thời bị chặn thao tác.');
    end if;
  end if;

  select username, (updated_at + interval '15 minutes')
  into v_priority_user, v_priority_expiry
  from public.car_hold_activities
  where vin = p_vin
    and type = 'QUEUE'
    and status = 'prioritized'
  order by updated_at desc
  limit 1;

  if v_priority_user is not null then
    if now() < v_priority_expiry then
      if v_priority_user <> p_username then
        return jsonb_build_object('status', 'ERROR', 'message', 'Xe đang trong 15 phút ưu tiên dành cho người khác.');
      else
        update public.car_hold_activities
        set status = 'converted',
            updated_at = now(),
            detail = 'Đã dùng quyền ưu tiên để giữ xe'
        where vin = p_vin
          and username = p_username
          and type = 'QUEUE'
          and status = 'prioritized';
      end if;
    else
      update public.car_hold_activities
      set status = 'waiting',
          action = 'queue_join',
          updated_at = now(),
          detail = 'Hết hạn ưu tiên, quay lại hàng chờ'
      where vin = p_vin
        and username = v_priority_user
        and type = 'QUEUE'
        and status = 'prioritized';
    end if;
  end if;

  select count(*)
  into v_past_hold_count
  from public.car_hold_activities
  where vin = p_vin
    and username = p_username
    and type = 'HOLD'
    and created_at >= now() - interval '7 days';

  if v_past_hold_count = 1 then
    v_hold_hours := 12;
  elsif v_past_hold_count = 2 then
    v_hold_hours := 6;
  elsif v_past_hold_count >= 3 then
    v_hold_hours := 2;
  end if;

  v_hold_exp_date := now() + (v_hold_hours * interval '1 hour');

  if exists (
    select 1
    from generate_series(now(), v_hold_exp_date, '1 hour'::interval) s
    where extract(dow from s) = 0
  ) then
    v_hold_exp_date := v_hold_exp_date + interval '24 hours';
  end if;

  v_hold_exp_str := to_char(v_hold_exp_date at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI:SS');

  update public.khoxe
  set trang_thai = 'Đang giữ',
      nguoi_giu_xe = p_full_name,
      username_giu_xe = p_username,
      thoi_gian_het_han_giu = v_hold_exp_str,
      hold_until = v_hold_exp_date,
      is_extension_requested = false,
      extension_count = 0,
      updated_at = now()
  where vin = p_vin
    and trang_thai = 'Chưa ghép';

  if not found then
    return jsonb_build_object('status', 'ERROR', 'message', 'Không thể giữ xe. Trạng thái xe đã thay đổi.');
  end if;

  insert into public.car_hold_activities (
    action, vin, username, tvbh_name,
    actor_name, actor_username,
    type, status, detail, reason,
    created_at, updated_at
  )
  values (
    'hold', p_vin, p_username, p_full_name,
    p_full_name, p_username,
    'HOLD', 'active',
    'Giữ xe đến ' || v_hold_exp_str,
    null,
    now(), now()
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Đã giữ xe thành công' || case when v_past_hold_count > 0 then ' (Lần giữ thứ ' || (v_past_hold_count + 1) || ' trong 7 ngày, thời gian rút ngắn còn ' || v_hold_hours || 'h)' else '' end
  );
end;
$$;

create or replace function public.rpc_release_car(
  p_vin text,
  p_outcome text default 'released'
)
returns jsonb
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  actor_role text := app_private.current_user_role();
  actor_username text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  holder_username text;
  holder_name text;
  v_next record;
  v_next_score integer;
  v_next_champion boolean;
  v_next_max_holds integer;
  v_next_current_holds integer;
begin
  select username_giu_xe, nguoi_giu_xe
  into holder_username, holder_name
  from public.khoxe
  where vin = p_vin
  for update;

  if holder_username is null and actor_role not in ('admin', 'manager', 'warehouse') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Xe hiện không có người giữ để bỏ giữ.');
  end if;

  if actor_role not in ('admin', 'manager', 'warehouse')
     and coalesce(holder_username, '') <> coalesce(actor_username, '') then
    return jsonb_build_object('status', 'ERROR', 'message', 'Bạn không thể bỏ giữ xe do người khác giữ.');
  end if;

  update public.khoxe
  set trang_thai = 'Chưa ghép',
      nguoi_giu_xe = null,
      username_giu_xe = null,
      thoi_gian_het_han_giu = null,
      hold_until = null,
      is_extension_requested = false,
      updated_at = now()
  where vin = p_vin;

  if p_outcome = 'matched' then
    update public.car_hold_activities
    set status = 'matched',
        action = 'pair',
        updated_at = now(),
        detail = 'Kết thúc giữ xe do ghép thành công'
    where vin = p_vin
      and username = holder_username
      and type = 'HOLD'
      and status = 'active';
  elsif p_outcome = 'expired' then
    update public.car_hold_activities
    set status = 'expired',
        action = 'expire_hold',
        updated_at = now(),
        detail = 'Hết hạn giữ xe'
    where vin = p_vin
      and username = holder_username
      and type = 'HOLD'
      and status = 'active';
  else
    update public.car_hold_activities
    set status = 'released',
        action = 'release',
        updated_at = now(),
        detail = 'Bỏ giữ xe'
    where vin = p_vin
      and username = holder_username
      and type = 'HOLD'
      and status = 'active';
  end if;

  if p_outcome <> 'matched' then
    for v_next in
      select username, tvbh_name
      from public.car_hold_activities
      where vin = p_vin
        and type = 'QUEUE'
        and status in ('waiting', 'notified')
      order by created_at asc
    loop
      select score, is_champion
      into v_next_score, v_next_champion
      from public.user_reputation_cache
      where username = v_next.username;

      if v_next_score is null then
        perform public.refresh_user_reputation(v_next.username);
        select score, is_champion
        into v_next_score, v_next_champion
        from public.user_reputation_cache
        where username = v_next.username;
      end if;

      v_next_score := coalesce(v_next_score, 100);
      v_next_champion := coalesce(v_next_champion, false);
      v_next_max_holds := public.max_hold_from_score(v_next_score, v_next_champion);

      select count(*)
      into v_next_current_holds
      from public.khoxe
      where username_giu_xe = v_next.username
        and trang_thai = 'Đang giữ';

      if v_next_current_holds < v_next_max_holds
         and not exists (
           select 1
           from public.car_hold_activities
           where username = v_next.username
             and type = 'QUEUE'
             and status = 'prioritized'
         ) then
        update public.car_hold_activities
        set status = 'prioritized',
            action = 'queue_prioritized',
            detail = 'Được ưu tiên giữ xe trong 15 phút',
            updated_at = now()
        where vin = p_vin
          and username = v_next.username
          and type = 'QUEUE'
          and status in ('waiting', 'notified');
        exit;
      end if;
    end loop;
  else
    update public.car_hold_activities
    set status = 'converted',
        updated_at = now(),
        detail = 'Xe đã ghép thành công'
    where vin = p_vin
      and type = 'QUEUE'
      and status in ('waiting', 'notified', 'prioritized');
  end if;

  return jsonb_build_object('status', 'SUCCESS', 'message', 'Đã hủy giữ xe thành công');
end;
$$;

create unique index if not exists car_hold_queue_unique_active_idx
on public.car_hold_activities (vin, username)
where type = 'QUEUE' and status in ('waiting', 'notified', 'prioritized');

create index if not exists car_hold_activities_type_status_idx
on public.car_hold_activities (type, status, updated_at desc);

create index if not exists car_hold_activities_username_idx
on public.car_hold_activities (username, created_at desc);

create index if not exists user_reputation_cache_score_idx
on public.user_reputation_cache (score desc, last_updated desc);

grant select, insert, update, delete on public.car_hold_activities to authenticated;
grant select on public.user_reputation_cache to authenticated;
grant select on public.reputation_adjustments to authenticated;
grant execute on function public.calculate_user_reputation(text) to authenticated;
grant execute on function public.refresh_user_reputation(text) to authenticated;
grant execute on function public.max_hold_from_score(integer, boolean) to authenticated;
grant execute on function public.cleanup_expired_queue_priorities() to authenticated;
grant execute on function public.rpc_join_hold_queue(text, text, text) to authenticated;
grant execute on function public.rpc_leave_hold_queue(text, text) to authenticated;
grant execute on function public.rpc_get_my_queued_vins(text) to authenticated;
grant execute on function public.rpc_hold_car(text, text, text) to authenticated;
grant execute on function public.rpc_release_car(text, text) to authenticated;
