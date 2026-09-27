-- RoadRescue payments, provider verification and  customer calling
alter table public.providers add column if not exists is_verified boolean not null default false;
alter table public.providers add column if not exists verified_at timestamptz;

create type public.payment_status as enum ('pending','paid','failed','refunded');
create type public.payment_method as enum ('cash','eft');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  customer_id uuid not null,
  amount numeric not null check (amount >= 0),
  method payment_method not null,
  status payment_status not null default 'pending',
  transaction_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;

create policy "customer own payments" on public.payments for select to authenticated
using (customer_id = auth.uid());

create policy "customer create own payment" on public.payments for insert to authenticated
with check (
  customer_id = auth.uid()
  and status in ('pending','paid')
  and exists (select 1 from public.requests r where r.id = request_id and r.customer_id = auth.uid())
);

create policy "admin payments" on public.payments for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

update public.providers
set is_verified = true, verified_at = coalesce(verified_at, now())
where status = 'approved';

alter publication supabase_realtime add table public.payments;
