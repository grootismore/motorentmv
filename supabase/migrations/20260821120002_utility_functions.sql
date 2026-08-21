-- Generic updated_at maintenance, reused by every table with an
-- updated_at column via `create trigger ... before update ...`.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
