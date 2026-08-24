-- Prompt 11 ("renter finance tracking"): makes booking_id optional on
-- transactions, as the prompt's own transaction field list calls for
-- ("Booking, optional") -- previously NOT NULL (20260821120015), which
-- forced every recorded income into a specific booking even when a
-- business took in money with nothing to attach it to (a parts sale, a
-- delivery fee charged separately, misc income). expenses already had no
-- booking concept at all; this brings transactions to the same honesty
-- about what income actually looks like.
--
-- A refund or adjustment always corrects a specific existing charge, so
-- those two types still require a booking -- only a standalone 'payment'
-- (new, unattributed income) may omit one.
alter table public.transactions alter column booking_id drop not null;

alter table public.transactions
  add constraint transactions_booking_required_unless_payment
  check (booking_id is not null or type = 'payment');

-- A free-text label for standalone income, same convention as
-- expenses.category (20260821120016) -- not a fixed enum, since the PRD
-- doesn't confirm a taxonomy for either side of the ledger. Only
-- meaningful without a booking; booking-linked payments already have
-- their own context (which booking, which customer) and don't need one.
alter table public.transactions add column category text;

-- 1. Standalone income is a higher-trust action than recording a payment
-- against a real booking a customer is party to (which staff already do
-- as a normal front-desk task) -- there's no booking, no customer, no
-- existing audit context to cross-check it against. Require financial
-- access (owner/manager) to record one, same bar as expenses
-- (expenses_write_financial_access). Booking-linked inserts are
-- unaffected: any org member can still record a payment/refund/
-- adjustment against a real booking.
drop policy "transactions_insert_org_member" on public.transactions;

create policy "transactions_insert_org_member"
  on public.transactions for insert
  to authenticated
  with check (
    public.is_org_member(organization_id)
    and recorded_by = auth.uid()
    and (booking_id is not null or public.has_financial_access(organization_id))
  );

-- No new column grant needed: 20260821120015's own `grant select, insert
-- on public.transactions to authenticated` was already whole-table (no
-- column list), so it already covers `category` automatically.

-- 2. recompute_booking_payment_status() (20260821120015) looks up and
-- updates a booking by id -- for a standalone transaction there is none,
-- so this is a documented no-op rather than relying on `id = null` never
-- matching anything (correct either way, but explicit is clearer and
-- skips a wasted SELECT).
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
  if v_booking_id is null then
    return null;
  end if;

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

-- 3. log_transaction_created() (20260821160002) mirrors every ledger
-- entry into booking_events, which is itself booking-scoped
-- (booking_id not null, 20260821120012) -- a standalone transaction has
-- no booking timeline to append to, so it's simply not logged there. The
-- transaction row itself, with its own recorded_by/created_at, remains
-- the audit record for standalone income.
create or replace function public.log_transaction_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.booking_id is null then
    return new;
  end if;

  insert into public.booking_events (booking_id, actor_id, event_type, metadata)
  values (
    new.booking_id,
    new.recorded_by,
    new.type || '_recorded',
    jsonb_build_object(
      'transaction_id', new.id,
      'amount_laari', new.amount_laari,
      'method', new.method,
      'reference', new.reference
    )
  );
  return new;
end;
$$;
