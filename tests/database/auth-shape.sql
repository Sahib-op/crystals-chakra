-- Plain PostgreSQL fixture upgrade only. Never run on hosted Supabase Auth tables.
alter table auth.users add column if not exists banned_until timestamptz;
alter table auth.users add column if not exists is_anonymous boolean not null default false;
create table if not exists auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  not_after timestamptz,
  aal text not null default 'aal1' check (aal in ('aal1','aal2'))
);
create index if not exists fixture_sessions_user_idx on auth.sessions(user_id);
create table if not exists auth.mfa_factors (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('verified','unverified'))
);
create index if not exists fixture_factors_user_idx on auth.mfa_factors(user_id);
revoke all on auth.sessions,auth.mfa_factors from public,anon,authenticated;
