create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  assigned_role text := 'staff';
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
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
