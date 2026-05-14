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
  normalized_vin text := upper(trim(coalesce(p_vin, '')));
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
  where upper(trim(vin)) = normalized_vin
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
    where upper(trim(vin)) = normalized_vin
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
    where upper(trim(vin)) = normalized_vin
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
  where upper(trim(vin)) = normalized_vin
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
        where upper(trim(vin)) = normalized_vin
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
      where upper(trim(vin)) = normalized_vin
        and username = v_priority_user
        and type = 'QUEUE'
        and status = 'prioritized';
    end if;
  end if;

  select count(*)
  into v_past_hold_count
  from public.car_hold_activities
  where upper(trim(vin)) = normalized_vin
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
  where upper(trim(vin)) = normalized_vin
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
    'hold', normalized_vin, p_username, p_full_name,
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

grant execute on function public.rpc_hold_car(text, text, text) to authenticated;
