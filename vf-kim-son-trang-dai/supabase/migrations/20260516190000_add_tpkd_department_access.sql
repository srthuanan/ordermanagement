alter table public.profiles
  add column if not exists department text;

update public.profiles
set department = coalesce(nullif(trim(department), ''), 'Kinh doanh')
where department is null or trim(department) = '';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'manager', 'sales', 'warehouse', 'delivery', 'staff'));

alter table app_private.staff_invites
  add column if not exists department text;

alter table app_private.staff_invites
  drop constraint if exists staff_invites_role_check;

alter table app_private.staff_invites
  add constraint staff_invites_role_check check (role in ('admin', 'manager', 'sales'));

create or replace function public.record_staff_invite(
  p_email text,
  p_full_name text,
  p_role text,
  p_department text default null,
  p_invite_status text default 'invite_sent',
  p_message text default null,
  p_invited_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = app_private, public
as $func$
begin
  insert into app_private.staff_invites (
    email,
    full_name,
    role,
    department,
    invite_status,
    invited_by,
    invited_at,
    activated_at,
    last_message,
    updated_at
  )
  values (
    lower(trim(p_email)),
    trim(p_full_name),
    case when p_role in ('admin', 'manager', 'sales') then p_role else 'sales' end,
    nullif(trim(coalesce(p_department, 'Kinh doanh')), ''),
    case when p_invite_status in ('invite_sent', 'recovery_sent', 'active', 'canceled') then p_invite_status else 'invite_sent' end,
    p_invited_by,
    now(),
    case when p_invite_status = 'active' then now() else null end,
    p_message,
    now()
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      department = excluded.department,
      invite_status = excluded.invite_status,
      invited_by = coalesce(excluded.invited_by, app_private.staff_invites.invited_by),
      invited_at = case
        when app_private.staff_invites.invite_status = 'active' then app_private.staff_invites.invited_at
        else excluded.invited_at
      end,
      activated_at = case
        when excluded.invite_status = 'active' then coalesce(app_private.staff_invites.activated_at, now())
        else app_private.staff_invites.activated_at
      end,
      last_message = excluded.last_message,
      updated_at = now();
end;
$func$;

grant execute on function public.record_staff_invite(text, text, text, text, text, text, uuid) to authenticated;

drop function if exists public.get_staff_directory();

create or replace function public.get_staff_directory()
returns table (
  id uuid,
  full_name text,
  role text,
  department text,
  email text,
  invite_status text,
  invited_at timestamptz,
  activated_at timestamptz,
  last_message text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth, app_private
as $func$
  select
    p.id,
    p.full_name,
    p.role,
    p.department,
    u.email,
    coalesce(i.invite_status, case when u.email_confirmed_at is not null then 'active' else 'invite_sent' end) as invite_status,
    coalesce(i.invited_at, p.created_at) as invited_at,
    coalesce(i.activated_at, case when u.email_confirmed_at is not null then u.updated_at else null end) as activated_at,
    i.last_message,
    p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select *
    from app_private.staff_invites s
    where lower(s.email) = lower(u.email)
    order by s.updated_at desc
    limit 1
  ) i on true
  order by p.created_at desc;
$func$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $func$
declare
  invited_by_admin boolean := coalesce((new.raw_user_meta_data ->> 'invited_by_admin')::boolean, false);
  assigned_role text := coalesce(new.raw_user_meta_data ->> 'role', 'sales');
  assigned_department text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'department'), ''), 'Kinh doanh');
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
    invited_by_admin := true;
    assigned_department := 'Ban quản trị';
  end if;

  if not invited_by_admin then
    raise exception 'Tài khoản này chưa được admin cấp quyền.';
  end if;

  if assigned_role not in ('admin', 'manager', 'sales') then
    assigned_role := 'sales';
  end if;

  insert into public.profiles (id, full_name, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Nhân viên mới'),
    assigned_role,
    case
      when assigned_role = 'admin' then null
      else assigned_department
    end
  )
  on conflict (id) do nothing;

  update app_private.staff_invites
  set invite_status = 'active',
      accepted_user_id = new.id,
      activated_at = now(),
      updated_at = now()
  where lower(email) = lower(coalesce(new.email, ''));

  return new;
end;
$func$;

grant execute on function public.get_staff_directory() to authenticated;
