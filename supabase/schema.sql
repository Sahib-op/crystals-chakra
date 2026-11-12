create table if not exists public.bookings (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 80),
  email text not null,
  service text not null check (service in ('birhaat','bhrigu','parashara')),
  status text not null default 'requested' check (status in ('requested','contacted','closed')),
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
-- No public policies: only the server's service-role key can access these records.
revoke all on public.bookings from anon, authenticated;
grant all on public.bookings to service_role;
