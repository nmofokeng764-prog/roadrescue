
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.my_provider_id() from public, anon;
revoke execute on function public.nearest_provider(double precision, double precision, text) from public, anon;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
