-- 1. Reviews -------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  customer_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 600),
  created_at timestamptz not null default now()
);
create index reviews_provider_idx on public.reviews(provider_id);
grant select, insert on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;

create policy "reviews readable by signed in users" on public.reviews
for select to authenticated using (true);

create policy "customer reviews own completed request" on public.reviews
for insert to authenticated with check (
  customer_id = auth.uid()
  and exists (
    select 1 from public.requests r
    where r.id = request_id
      and r.customer_id = auth.uid()
      and r.provider_id = reviews.provider_id
      and r.status = 'completed'
  )
);

create policy "admin reviews" on public.reviews for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

-- rating summary any signed in user may read
create or replace function public.provider_rating(_provider_id uuid)
returns table(avg_rating numeric, review_count integer)
language sql stable security definer set search_path = public as $$
  select round(avg(rating)::numeric, 1), count(*)::int
  from public.reviews where provider_id = _provider_id
$$;
revoke execute on function public.provider_rating(uuid) from public, anon;
grant execute on function public.provider_rating(uuid) to authenticated;

-- 2. Safety alerts --------------------------------------------------------
create type public.safety_status as enum ('open','acknowledged','police_notified','resolved');

create table public.safety_alerts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  customer_id uuid not null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  note text check (note is null or char_length(note) <= 500),
  police_reference text,
  status safety_status not null default 'open',
  created_at timestamptz not null default now()
);
create index safety_alerts_status_idx on public.safety_alerts(status, created_at desc);
grant select, insert on public.safety_alerts to authenticated;
grant all on public.safety_alerts to service_role;
alter table public.safety_alerts enable row level security;

create policy "customer own alerts" on public.safety_alerts
for select to authenticated using (customer_id = auth.uid());

create policy "customer raises own alert" on public.safety_alerts
for insert to authenticated with check (
  customer_id = auth.uid()
  and status = 'open'
  and police_reference is null
  and (request_id is null or exists (
    select 1 from public.requests r where r.id = request_id and r.customer_id = auth.uid()
  ))
);

create policy "admin alerts" on public.safety_alerts for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

-- the assigned provider may see that an alert was raised on their job (no notes)
create policy "provider sees alert on own job" on public.safety_alerts
for select to authenticated using (
  public.my_provider_id() is not null and exists (
    select 1 from public.requests r
    where r.id = safety_alerts.request_id and r.provider_id = public.my_provider_id()
  )
);

alter publication supabase_realtime add table public.safety_alerts;

-- 3. Emergency contact numbers -------------------------------------------
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  phone text not null,
  sms_number text,
  ussd_code text,
  kind text not null default 'call_centre',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.emergency_contacts to anon, authenticated;
grant all on public.emergency_contacts to service_role;
alter table public.emergency_contacts enable row level security;

create policy "anyone reads active emergency contacts" on public.emergency_contacts
for select to anon, authenticated using (is_active);

create policy "admin manages emergency contacts" on public.emergency_contacts
for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

insert into public.emergency_contacts (label, phone, sms_number, ussd_code, kind, sort_order) values
  ('RoadRescue 24/7 call agent', '0800 911 911', '32211', '*134*911#', 'call_centre', 1),
  ('SAPS emergency (police)', '10111', null, null, 'police', 2),
  ('Ambulance / ER services', '10177', null, null, 'medical', 3),
  ('All emergencies from a cellphone', '112', null, null, 'general', 4);

-- 4. Account & data security ---------------------------------------------
-- one account per email address
create unique index profiles_email_unique on public.profiles (lower(email)) where email <> '';

alter table public.profiles
  add constraint profiles_full_name_len check (char_length(full_name) <= 120),
  add constraint profiles_phone_len check (phone is null or char_length(phone) <= 30);

alter table public.requests
  add constraint requests_instructions_len check (instructions is null or char_length(instructions) <= 500),
  add constraint requests_coords check (lat between -90 and 90 and lng between -180 and 180);

alter table public.vehicles
  add constraint vehicles_text_len check (
    char_length(make_model) <= 80 and char_length(colour) <= 40 and char_length(registration) <= 20
  );

-- block duplicate registrations at signup time with a clear message
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if exists (select 1 from public.profiles p where lower(p.email) = lower(coalesce(new.email,'')) and coalesce(new.email,'') <> '') then
    raise exception 'An account with this email address already exists.' using errcode = '23505';
  end if;

  insert into public.profiles (id, full_name, email, phone)
  values (new.id, left(coalesce(m->>'full_name',''),120), coalesce(new.email,''), left(m->>'phone',30));

  if m->>'account_type' = 'provider' then
    insert into public.user_roles (user_id, role) values (new.id, 'provider');
    insert into public.providers (user_id, business_name, contact_phone, service_area, services, description, base_lat, base_lng)
    values (new.id, left(coalesce(m->>'business_name','Unnamed business'),120), left(coalesce(m->>'phone',''),30),
      left(coalesce(m->>'service_area',''),120),
      coalesce(array(select jsonb_array_elements_text(m->'services')), '{}'),
      left(m->>'description', 600), nullif(m->>'base_lat','')::double precision, nullif(m->>'base_lng','')::double precision);
  else
    insert into public.user_roles (user_id, role) values (new.id, 'customer');
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- providers may never approve or verify themselves
create or replace function public.guard_provider_self_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(),'admin') then return new; end if;
  new.status := old.status;
  new.is_verified := old.is_verified;
  new.verified_at := old.verified_at;
  new.user_id := old.user_id;
  return new;
end $$;
revoke execute on function public.guard_provider_self_update() from public, anon, authenticated;
create trigger providers_guard before update on public.providers
for each row execute function public.guard_provider_self_update();

-- customers may only cancel; they can never reassign a provider or change the price
create or replace function public.guard_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(),'admin') then return new; end if;
  if old.customer_id = auth.uid() then
    new.provider_id := old.provider_id;
    new.est_cost := old.est_cost;
    new.customer_id := old.customer_id;
    if new.status <> old.status and new.status <> 'cancelled' then
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_request_update() from public, anon, authenticated;
create trigger requests_guard before update on public.requests
for each row execute function public.guard_request_update();