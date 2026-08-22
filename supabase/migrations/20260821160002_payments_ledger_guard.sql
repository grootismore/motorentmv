-- Payment ledger guard rules and audit trail (PRD Prompt 6 / §6.4/§6.6).
-- transactions already models cash/bank_transfer/external_reference
-- payments, refunds and adjustments with no card-data column at all
-- (20260821120015) and client INSERT is already permitted directly
-- (transactions_insert_org_member) -- what's missing is a real,
-- always-enforced guarantee that a refund can never exceed what was
-- actually received, and an audit trail entry for every ledger write.

-- 1. Refund cap. Data-dependent (needs to sum the existing ledger), so it
-- can't be expressed as a column grant or a simple check constraint --
-- same reasoning as recompute_booking_payment_status() just below it in
-- 20260821120015: SECURITY DEFINER so the sum is correct regardless of
-- the inserting staff member's own financial-access level (a front-desk
-- staffer without financial access can still only SELECT transactions
-- they personally recorded, which would undercount the real total paid).
-- A BEFORE INSERT trigger enforces this for every insert path, including
-- a raw client insert -- not just calls that happen to go through some
-- particular RPC.
create or replace function public.transactions_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_paid integer;
  v_refunded integer;
begin
  if new.type = 'refund' then
    select
      coalesce(sum(amount_laari) filter (where type = 'payment'), 0),
      coalesce(sum(amount_laari) filter (where type = 'refund'), 0)
    into v_paid, v_refunded
    from public.transactions
    where booking_id = new.booking_id;

    if new.amount_laari > (v_paid - v_refunded) then
      raise exception 'refund of % laari exceeds the % laari still refundable for booking %',
        new.amount_laari, v_paid - v_refunded, new.booking_id
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_guard_trigger
  before insert on public.transactions
  for each row execute function public.transactions_guard();

-- 2. Audit trail: mirror every ledger entry into booking_events, same
-- pattern as log_booking_created (20260821140002) and log_inspection_event
-- (20260821160001) -- an AFTER INSERT trigger, not a bespoke RPC, so it
-- fires no matter which code path inserted the row.
create or replace function public.log_transaction_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
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

create trigger transactions_log_created
  after insert on public.transactions
  for each row execute function public.log_transaction_created();
