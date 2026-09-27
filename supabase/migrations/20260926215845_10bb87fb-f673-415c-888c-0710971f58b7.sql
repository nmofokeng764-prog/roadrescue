drop policy if exists "customer create own payment" on public.payments;

create policy "customer create own cash or eft payment" on public.payments
for insert to authenticated
with check (
  customer_id = auth.uid()
  and method in ('cash', 'instant_eft')
  and status in ('pending', 'paid')
  and exists (
    select 1 from public.requests r
    where r.id = request_id and r.customer_id = auth.uid()
  )
);