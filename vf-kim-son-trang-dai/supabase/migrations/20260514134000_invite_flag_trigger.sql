create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  invited_by_admin boolean := coalesce((new.raw_app_meta_data ->> 'invited_by_admin')::boolean, false);
  assigned_role text := coalesce(new.raw_app_meta_data ->> 'role', 'sales');
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

  return new;
end;
$$;
