-- Supabase supplies anon/authenticated/auth.uid()/auth.jwt() in deployed projects.
-- Plain PostgreSQL development bootstrap is separate; never overwrite managed auth.
create schema catalog;
create schema studio;
revoke all on schema catalog, studio from public, anon, authenticated;
grant usage on schema catalog to anon, authenticated;
grant usage on schema studio to authenticated;
alter default privileges in schema catalog revoke all on tables from public;
alter default privileges in schema studio revoke all on tables from public;
alter default privileges in schema catalog revoke execute on functions from public;
alter default privileges in schema studio revoke execute on functions from public;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'chakra_runtime') then
    create role chakra_runtime nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
  if exists (select 1 from pg_roles where rolname = 'chakra_runtime' and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication)) then
    raise exception 'Unsafe chakra_runtime role';
  end if;
end $$;
grant anon, authenticated to chakra_runtime with inherit false;

create table studio.owner_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  granted_at timestamptz not null default now()
);
alter table studio.owner_access enable row level security;
-- No browser grants/policy for this allowlist. Only the narrow helper can consult it.
create function studio.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt())->>'aal', '') = 'aal2'
    and exists (select 1 from studio.owner_access where user_id = (select auth.uid()) and active);
$$;
revoke all on function studio.is_owner() from public, anon;
grant execute on function studio.is_owner() to authenticated;

create function catalog.valid_features(value text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(cardinality(value) between 1 and 12 and not exists (
    select 1 from unnest(value) as item where item is null or char_length(item) not between 1 and 240 or item !~ '[^[:space:]]'
  ), false);
$$;
revoke all on function catalog.valid_features(text[]) from public, anon;
grant execute on function catalog.valid_features(text[]) to authenticated;

create table catalog.practitioners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{0,47}$'),
  name text not null check (char_length(name) between 1 and 100 and name ~ '[^[:space:]]'),
  hindi_name text check (char_length(hindi_name) between 1 and 160),
  biography text not null default '' check (char_length(biography) <= 2000),
  portrait_path text check (char_length(portrait_path) <= 512 and portrait_path ~ '^/images/[a-zA-Z0-9/_-]+[.](png|jpg|jpeg|webp|avif|svg)$'),
  published boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table catalog.readings (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{0,47}$'),
  type text not null check (type in ('tarot','astrology')),
  title text not null check (char_length(title) between 1 and 120 and title ~ '[^[:space:]]'),
  hindi_title text check (char_length(hindi_title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 600 and description ~ '[^[:space:]]'),
  features text[] not null check (catalog.valid_features(features)),
  -- Whole-INR public display contract today; integer paise are authoritative in storage.
  price_minor_units integer check (price_minor_units between 0 and 1000000000 and price_minor_units % 100 = 0),
  currency text not null default 'INR' check (currency = 'INR'),
  contact_destination text not null default 'studio' check (contact_destination = 'studio'),
  practitioner_id uuid references catalog.practitioners(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index readings_practitioner_idx on catalog.readings(practitioner_id);
create index readings_published_order_idx on catalog.readings(sort_order, id) where status = 'published';

create table studio.consultations (
  id uuid primary key default gen_random_uuid(),
  reading_id text references catalog.readings(id) on delete restrict,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  email text check (char_length(email) between 3 and 320 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  channel text not null check (channel in ('whatsapp','phone','in_person','legacy_email')),
  status text not null default 'enquiry' check (status in ('enquiry','scheduled','in_progress','completed','cancelled')),
  payment_status text not null default 'unrecorded' check (payment_status in ('unrecorded','arranged','recorded_received','refunded')),
  amount_minor_units integer check (amount_minor_units between 0 and 1000000000),
  currency text not null default 'INR' check (currency = 'INR'),
  delivery_method text check (delivery_method in ('phone','video','in_person','report')),
  scheduled_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 4000),
  purpose text not null default 'reading_consultation' check (purpose = 'reading_consultation'),
  notice_version text check (char_length(notice_version) between 1 and 80),
  consent_status text not null default 'unknown' check (consent_status in ('unknown','provided','withdrawn')),
  retention_review_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create index consultations_reading_idx on studio.consultations(reading_id);
create index consultations_created_by_idx on studio.consultations(created_by);
create index consultations_updated_by_idx on studio.consultations(updated_by);
create index consultations_status_created_idx on studio.consultations(status, created_at desc, id desc);
create index consultations_retention_idx on studio.consultations(retention_review_at) where retention_review_at is not null;

create table studio.legacy_imports (
  source_key text not null check (source_key ~ '^[a-zA-Z0-9_-]{1,80}$'),
  legacy_id uuid not null,
  consultation_id uuid not null unique references studio.consultations(id) on delete cascade,
  original_status text not null check (original_status in ('requested','contacted','closed')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  imported_at timestamptz not null default now(),
  primary key (source_key, legacy_id)
);
create table studio.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('reading','practitioner','consultation')),
  entity_id text not null check (char_length(entity_id) between 1 and 128),
  action text not null check (action in ('created','updated','deleted')),
  revision integer,
  occurred_at timestamptz not null default now()
);
create index audit_events_actor_idx on studio.audit_events(actor_id);
create index audit_events_entity_time_idx on studio.audit_events(entity_type, entity_id, occurred_at desc, id desc);

create function studio.revision_before_update() returns trigger
language plpgsql set search_path = '' as $$ begin
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  new.revision := old.revision + 1;
  if tg_table_name = 'consultations' then
    new.created_by := old.created_by;
    new.updated_by := (select auth.uid());
  end if;
  return new;
end $$;
create function studio.consultation_provenance() returns trigger
language plpgsql set search_path = '' as $$ begin
  new.created_by := (select auth.uid());
  new.updated_by := new.created_by;
  return new;
end $$;
create function studio.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare entity text; record_id text; record_revision integer;
begin
  entity := case tg_table_name when 'readings' then 'reading' when 'practitioners' then 'practitioner' when 'consultations' then 'consultation' else null end;
  if entity is null then raise exception 'Invalid audit source'; end if;
  if tg_op = 'DELETE' then record_id := old.id::text; record_revision := old.revision;
  else record_id := new.id::text; record_revision := new.revision; end if;
  insert into studio.audit_events(actor_id, entity_type, entity_id, action, revision)
    values ((select auth.uid()), entity, record_id, case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end, record_revision);
  return null;
end $$;
revoke all on function studio.revision_before_update(), studio.consultation_provenance(), studio.audit_change() from public, anon, authenticated;

create trigger readings_revision before update on catalog.readings for each row execute function studio.revision_before_update();
create trigger practitioners_revision before update on catalog.practitioners for each row execute function studio.revision_before_update();
create trigger consultations_revision before update on studio.consultations for each row execute function studio.revision_before_update();
create trigger consultations_provenance before insert on studio.consultations for each row execute function studio.consultation_provenance();
create trigger readings_audit after insert or update or delete on catalog.readings for each row execute function studio.audit_change();
create trigger practitioners_audit after insert or update or delete on catalog.practitioners for each row execute function studio.audit_change();
create trigger consultations_audit after insert or update or delete on studio.consultations for each row execute function studio.audit_change();

alter table catalog.readings enable row level security;
alter table catalog.readings force row level security;
alter table catalog.practitioners enable row level security;
alter table catalog.practitioners force row level security;
alter table studio.consultations enable row level security;
alter table studio.consultations force row level security;
alter table studio.legacy_imports enable row level security;
alter table studio.legacy_imports force row level security;
alter table studio.audit_events enable row level security;

revoke all on all tables in schema catalog, studio from public, anon, authenticated;
grant select on catalog.readings, catalog.practitioners to anon, authenticated;
grant insert, update on catalog.readings, catalog.practitioners to authenticated;
grant select, insert, update, delete on studio.consultations to authenticated;
grant select on studio.audit_events, studio.legacy_imports to authenticated;
create policy reading_public on catalog.readings for select to anon, authenticated using (status = 'published');
create policy practitioner_public on catalog.practitioners for select to anon, authenticated using (published);
create policy reading_owner on catalog.readings for all to authenticated using ((select studio.is_owner())) with check ((select studio.is_owner()));
create policy practitioner_owner on catalog.practitioners for all to authenticated using ((select studio.is_owner())) with check ((select studio.is_owner()));
create policy consultation_owner on studio.consultations for all to authenticated using ((select studio.is_owner())) with check ((select studio.is_owner()));
create policy legacy_owner on studio.legacy_imports for select to authenticated using ((select studio.is_owner()));
create policy audit_owner on studio.audit_events for select to authenticated using ((select studio.is_owner()));
