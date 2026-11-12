-- ONLY for disposable plain PostgreSQL tests/development, not a Supabase migration.
-- This supplies the database-facing shape of managed Auth; it does not verify JWTs.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if exists (select 1 from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)) then
    raise exception 'Test roles must not bypass row security';
  end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif((select auth.jwt())->>'sub', '')::uuid;
$$;
revoke all on schema auth from public;
revoke all on table auth.users from public, anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
