-- expenses: operating cost ledger, optionally per-vehicle (PRD §6.6).
-- Categories are business-configurable free text — the PRD doesn't
-- confirm a fixed taxonomy, so this isn't an enum.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id),
  category text not null,
  amount_laari integer not null check (amount_laari > 0),
  occurred_on date not null,
  note text,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_organization_id_idx on public.expenses (organization_id, occurred_on);
create index expenses_vehicle_id_idx on public.expenses (vehicle_id);

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

-- Financial data: owner/manager only (PRD §6.6), no "staff recorded it so
-- they can see it" carve-out here — unlike transactions, expenses aren't
-- a normal front-desk task, so there's no operational reason for staff
-- to need visibility by default.
create policy "expenses_select_financial_access"
  on public.expenses for select
  to authenticated
  using (public.has_financial_access(organization_id));

create policy "expenses_write_financial_access"
  on public.expenses for insert
  to authenticated
  with check (public.has_financial_access(organization_id) and recorded_by = auth.uid());

create policy "expenses_update_financial_access"
  on public.expenses for update
  to authenticated
  using (public.has_financial_access(organization_id));

grant select, insert, update on public.expenses to authenticated;
