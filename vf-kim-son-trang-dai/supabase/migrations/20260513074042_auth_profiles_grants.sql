grant usage on schema public to anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant select, insert, update on public.customers to authenticated;
grant select, insert, update on public.khoxe to authenticated;
grant select, insert, update on public.donhang to authenticated;
grant select on public.audit_logs to authenticated;
grant execute on function public.hold_khoxe_vehicle(text, timestamptz) to authenticated;
grant execute on function public.release_khoxe_hold(text) to authenticated;
grant execute on function public.pair_donhang_with_khoxe(text, text) to authenticated;
grant execute on function public.unpair_donhang_with_khoxe(text) to authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Nhân viên mới'),
    'staff'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();
