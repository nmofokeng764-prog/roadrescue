
create type public.app_role as enum ('admin','provider','customer');
create type public.provider_status as enum ('pending','approved','rejected');
create type public.request_status as enum ('pending','matched','en_route','arrived','completed','cancelled');

create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  email text not null default '',
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  make_model text not null,
  category text not null,
  colour text not null,
  registration text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vehicles to authenticated;
grant all on public.vehicles to service_role;
alter table public.vehicles enable row level security;

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  business_name text not null,
  contact_phone text not null default '',
  service_area text not null default '',
  services text[] not null default '{}',
  description text,
  base_lat double precision,
  base_lng double precision,
  current_lat double precision,
  current_lng double precision,
  is_online boolean not null default false,
  status provider_status not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, update on public.providers to authenticated;
grant all on public.providers to service_role;
alter table public.providers enable row level security;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  service_type text not null,
  instructions text,
  lat double precision not null,
  lng double precision not null,
  distance_km numeric,
  eta_min integer,
  est_cost numeric,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.requests to authenticated;
grant all on public.requests to service_role;
alter table public.requests enable row level security;

create or replace function public.my_provider_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.providers where user_id = auth.uid() and status = 'approved' $$;

-- profiles
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
-- roles
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
-- vehicles
create policy "own vehicles" on public.vehicles for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "admin vehicles" on public.vehicles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "provider sees request vehicles" on public.vehicles for select to authenticated using (
  public.my_provider_id() is not null and exists (
    select 1 from public.requests r where r.vehicle_id = vehicles.id
    and (r.provider_id = public.my_provider_id() or r.status = 'pending')));
-- providers
create policy "own provider" on public.providers for select to authenticated using (user_id = auth.uid());
create policy "own provider update" on public.providers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin providers" on public.providers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "customer sees assigned provider" on public.providers for select to authenticated using (
  exists (select 1 from public.requests r where r.provider_id = providers.id and r.customer_id = auth.uid()));
-- requests
create policy "customer own requests" on public.requests for select to authenticated using (customer_id = auth.uid());
create policy "customer create" on public.requests for insert to authenticated with check (customer_id = auth.uid() and status = 'pending' and provider_id is null);
create policy "customer cancel" on public.requests for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "provider sees requests" on public.requests for select to authenticated using (
  public.my_provider_id() is not null and (provider_id = public.my_provider_id() or status = 'pending'));
create policy "provider updates" on public.requests for update to authenticated using (
  public.my_provider_id() is not null and (provider_id = public.my_provider_id() or (status = 'pending' and provider_id is null)))
  with check (provider_id = public.my_provider_id());
create policy "admin requests" on public.requests for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();

-- nearest provider estimate (no private data leaked)
create or replace function public.nearest_provider(_lat double precision, _lng double precision, _service text)
returns table(business_name text, distance_km double precision)
language sql stable security definer set search_path = public as $$
  select p.business_name,
    6371 * 2 * asin(sqrt(power(sin(radians(coalesce(p.current_lat,p.base_lat) - _lat)/2),2)
      + cos(radians(_lat)) * cos(radians(coalesce(p.current_lat,p.base_lat)))
      * power(sin(radians(coalesce(p.current_lng,p.base_lng) - _lng)/2),2))) as distance_km
  from public.providers p
  where p.status = 'approved' and p.is_online and _service = any(p.services)
    and coalesce(p.current_lat,p.base_lat) is not null
  order by 2 asc limit 1
$$;
grant execute on function public.nearest_provider(double precision, double precision, text) to authenticated;

-- new user bootstrap
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(m->>'full_name',''), coalesce(new.email,''), m->>'phone');
  if m->>'account_type' = 'provider' then
    insert into public.user_roles (user_id, role) values (new.id, 'provider');
    insert into public.providers (user_id, business_name, contact_phone, service_area, services, description, base_lat, base_lng)
    values (new.id, coalesce(m->>'business_name','Unnamed business'), coalesce(m->>'phone',''),
      coalesce(m->>'service_area',''),
      coalesce(array(select jsonb_array_elements_text(m->'services')), '{}'),
      m->>'description', nullif(m->>'base_lat','')::double precision, nullif(m->>'base_lng','')::double precision);
  else
    insert into public.user_roles (user_id, role) values (new.id, 'customer');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.providers;
