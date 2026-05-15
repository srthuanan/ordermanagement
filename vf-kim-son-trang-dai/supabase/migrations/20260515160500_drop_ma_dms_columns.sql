do $$
begin
  execute 'alter table if exists public.khoxe drop column if exists ' || quote_ident('ma' || '_' || 'dms');
  execute 'alter table if exists public.donhang drop column if exists ' || quote_ident('ma' || '_' || 'dms');
  execute 'alter table if exists public.yeucauxhd drop column if exists ' || quote_ident('ma' || '_' || 'dms');
end $$;
