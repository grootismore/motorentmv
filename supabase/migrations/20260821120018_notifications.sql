-- notifications: recipient-scoped, in-app + push (PRD §8/§9). Push
-- delivery outcome is tracked as columns on the same row for MVP rather
-- than a separate table — "recorded separately" in the PRD reads as a
-- distinct concept (was this actually delivered?), not necessarily a
-- 14th table; revisit if delivery ever needs its own retry history.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

-- A recipient may mark their own notification read; nothing else about a
-- notification is client-writable (type/payload/delivery are system-set).
create policy "notifications_update_own_read_state"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
-- No client INSERT grant: notifications are always created server-side
-- (by the same code path that causes the underlying event), never
-- fabricated by a client claiming to notify some other user.
