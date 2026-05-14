create table if not exists app_private.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null default 'sales' check (role in ('admin', 'sales')),
  invite_status text not null default 'invite_sent' check (invite_status in ('invite_sent', 'recovery_sent', 'active')),
  invited_by uuid references auth.users (id) on delete set null,
  accepted_user_id uuid references auth.users (id) on delete set null,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  last_message text,
  updated_at timestamptz not null default now()
);

alter table app_private.staff_invites
  add column if not exists invite_status text not null default 'invite_sent';

alter table app_private.staff_invites
  add column if not exists invited_by uuid references auth.users (id) on delete set null;

alter table app_private.staff_invites
  add column if not exists accepted_user_id uuid references auth.users (id) on delete set null;

alter table app_private.staff_invites
  add column if not exists invited_at timestamptz not null default now();

alter table app_private.staff_invites
  add column if not exists activated_at timestamptz;

alter table app_private.staff_invites
  add column if not exists last_message text;

alter table app_private.staff_invites
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.record_staff_invite(
  p_email text,
  p_full_name text,
  p_role text,
  p_invite_status text,
  p_message text default null,
  p_invited_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  insert into app_private.staff_invites (
    email,
    full_name,
    role,
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
    case when p_role in ('admin', 'sales') then p_role else 'sales' end,
    case when p_invite_status in ('invite_sent', 'recovery_sent', 'active') then p_invite_status else 'invite_sent' end,
    p_invited_by,
    now(),
    case when p_invite_status = 'active' then now() else null end,
    p_message,
    now()
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
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
$$;

create or replace function public.get_staff_directory()
returns table (
  id uuid,
  full_name text,
  role text,
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
as $$
  select
    p.id,
    p.full_name,
    p.role,
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
$$;

grant execute on function public.record_staff_invite(text, text, text, text, text, uuid) to authenticated;
grant execute on function public.get_staff_directory() to authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  invited_by_admin boolean := coalesce((new.raw_user_meta_data ->> 'invited_by_admin')::boolean, false);
  assigned_role text := coalesce(new.raw_user_meta_data ->> 'role', 'sales');
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
    invited_by_admin := true;
  end if;

  if not invited_by_admin then
    raise exception 'Tài khoản này chưa được admin cấp quyền.';
  end if;

  if assigned_role not in ('admin', 'sales') then
    assigned_role := 'sales';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Nhân viên mới'),
    assigned_role
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
$$;
