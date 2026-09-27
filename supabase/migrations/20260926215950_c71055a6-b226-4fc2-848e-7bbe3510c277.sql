create or replace function public.provider_rating(_provider_id uuid)
returns table(avg_rating numeric, review_count integer)
language sql stable security invoker set search_path = public as $$
  select round(avg(rating)::numeric, 1), count(*)::int
  from public.reviews where provider_id = _provider_id
$$;
revoke execute on function public.provider_rating(uuid) from public, anon;
grant execute on function public.provider_rating(uuid) to authenticated;