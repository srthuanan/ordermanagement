alter function public.rpc_hold_car(text, text, text) security definer;
alter function public.rpc_release_car(text, text) security definer;
alter function public.pair_donhang_with_khoxe_safe(text, text, timestamptz, timestamptz) security definer;
alter function public.unpair_donhang_with_khoxe_safe(text, timestamptz) security definer;
