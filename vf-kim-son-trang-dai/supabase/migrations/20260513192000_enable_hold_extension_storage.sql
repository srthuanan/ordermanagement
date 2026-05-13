insert into storage.buckets (id, name, public)
values ('yeucauxhd-files', 'yeucauxhd-files', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "authenticated read yeucauxhd-files" on storage.objects;
drop policy if exists "authenticated upload yeucauxhd-files" on storage.objects;
drop policy if exists "authenticated update yeucauxhd-files" on storage.objects;
drop policy if exists "authenticated delete yeucauxhd-files" on storage.objects;

create policy "authenticated read yeucauxhd-files"
on storage.objects for select
to authenticated
using (bucket_id = 'yeucauxhd-files');

create policy "authenticated upload yeucauxhd-files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'yeucauxhd-files');

create policy "authenticated update yeucauxhd-files"
on storage.objects for update
to authenticated
using (bucket_id = 'yeucauxhd-files')
with check (bucket_id = 'yeucauxhd-files');

create policy "authenticated delete yeucauxhd-files"
on storage.objects for delete
to authenticated
using (bucket_id = 'yeucauxhd-files');
