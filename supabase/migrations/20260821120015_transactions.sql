-- transactions: the payment/refund/adjustment ledger (PRD §6.4/§6.6). No
-- card data is ever stored here — MVP methods are cash, bank transfer or
-- an external payment reference only.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  -- Denormalized from bookings for RLS/reporting without a join on every
  -- policy check — standard for a multi-tenant ledger table.
  organization_id uuid not null references public.organizations (id),
  type public.transaction_type not null,
  method public.payment_method,
  amount_laari integer not null check (amount_laari > 0),
  reference text,
  note text,
  recorded_by uuid not null references public.profiles (id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- 'adjustment' entries (late fee, damage charge, discount) aren't a
  -- cash/bank/reference event, so they don't carry a payment method.
  check ((type = 'adjustment') = (method is null))
);

create index transactions_booking_id_idx on public.transactions (booking_id);
create index transactions_organization_id_idx on public.transactions (organization_id);

alter table public.transactions enable row level security;

-- Owners/managers see the full ledger (PRD §6.6: "Owners see all
-- financial data"); staff see only entries they personally recorded
-- ("staff permissions must be explicit" — recording a payment at handover
-- is a normal staff task, but full financial visibility is not); a
-- customer sees their own booking's transactions (receipts).
create policy "transactions_select"
  on public.transactions for select
  to authenticated
  using (
    public.has_financial_access(organization_id)
    or recorded_by = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.id = transactions.booking_id and b.customer_id = auth.uid()
    )
  );

create policy "transactions_insert_org_member"
  on public.transactions for insert
  to authenticated
  with check (public.is_org_member(organization_id) and recorded_by = auth.uid());

grant select, insert on public.transactions to authenticated;
-- No UPDATE/DELETE grant: a mistaken entry is corrected with a
-- counteracting transaction, not an edit — the ledger stays an audit
-- trail, matching PRD §6.4's snapshot-immutability spirit for money.

-- Keep bookings.payment_status in sync whenever the ledger changes.
-- SECURITY DEFINER because payment_status is deliberately not in
-- bookings' client UPDATE column grant (see 20260821120011_bookings.sql).
create or replace function public.recompute_booking_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking_id uuid := coalesce(new.booking_id, old.booking_id);
  v_total_amount integer;
  v_paid integer;
  v_refunded integer;
  v_status public.payment_status;
begin
  select total_amount_laari into v_total_amount from public.bookings where id = v_booking_id;

  select
    coalesce(sum(amount_laari) filter (where type = 'payment'), 0),
    coalesce(sum(amount_laari) filter (where type = 'refund'), 0)
  into v_paid, v_refunded
  from public.transactions
  where booking_id = v_booking_id;

  v_status := case
    when v_paid = 0 then 'unpaid'
    when v_refunded = 0 and (v_total_amount is null or v_paid < v_total_amount) then 'partially_paid'
    when v_refunded = 0 then 'paid'
    when v_paid - v_refunded <= 0 then 'refunded'
    else 'partially_refunded'
  end;

  update public.bookings set payment_status = v_status where id = v_booking_id;
  return null;
end;
$$;

create trigger recompute_payment_status_on_transaction
  after insert or update or delete on public.transactions
  for each row execute function public.recompute_booking_payment_status();
