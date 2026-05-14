create table if not exists app_private.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null default 'sales' check (role in ('admin', 'sales')),
  invited_by uuid references auth.users (id) on delete set null,
  accepted_user_id uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

update public.profiles
set role = 'sales'
where role <> 'admin';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'sales'));

drop policy if exists "users can create own profile" on public.profiles;
revoke insert on public.profiles from authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  invite_record app_private.staff_invites%rowtype;
begin
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, full_name, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Admin'),
      'admin'
    )
    on conflict (id) do nothing;

    return new;
  end if;

  select *
  into invite_record
  from app_private.staff_invites
  where lower(email) = lower(coalesce(new.email, ''))
    and accepted_at is null
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Tài khoản này chưa được admin mời.';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(invite_record.full_name, new.raw_user_meta_data ->> 'full_name', new.email, 'Nhân viên mới'),
    'sales'
  )
  on conflict (id) do nothing;

  update app_private.staff_invites
  set accepted_user_id = new.id,
      accepted_at = now()
  where id = invite_record.id
    and accepted_at is null;

  return new;
end;
$$;
