-- Verified Shopify webhook intake and a minimal, PII-free order projection.
-- Shopify stays the system of record for orders, payments, stock and customer
-- details. This schema keeps only what the studio needs to see order state, and
-- a delivery log that makes webhook processing idempotent.
create schema commerce;
revoke all on schema commerce from public, anon, authenticated;
alter default privileges in schema commerce revoke all on tables from public;
alter default privileges in schema commerce revoke execute on functions from public;

-- The API assumes this role only inside the webhook transaction (SET LOCAL ROLE),
-- after verifying the Shopify signature. It cannot read studio or auth data.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'chakra_commerce_writer') then
    create role chakra_commerce_writer nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
  if exists (select 1 from pg_roles where rolname = 'chakra_commerce_writer' and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication or rolcanlogin)) then
    raise exception 'Unsafe chakra_commerce_writer role';
  end if;
end $$;
grant chakra_commerce_writer to chakra_runtime with inherit false;
grant usage on schema commerce to chakra_commerce_writer, authenticated;

create table commerce.webhook_deliveries (
  -- X-Shopify-Webhook-Id: unique per delivery, so retries of a delivery dedupe.
  webhook_id text primary key check (webhook_id ~ '^[A-Za-z0-9._:-]{1,100}$'),
  -- X-Shopify-Event-Id: correlates deliveries from one merchant action.
  event_id text check (event_id is null or event_id ~ '^[A-Za-z0-9._:-]{1,100}$'),
  topic text not null check (topic ~ '^[a-z_]+/[a-z_]+$' and length(topic) <= 60),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  outcome text not null check (outcome in ('applied', 'stale', 'ignored')),
  shopify_order_id bigint check (shopify_order_id is null or shopify_order_id > 0),
  received_at timestamptz not null default now()
);
create index webhook_deliveries_order_idx on commerce.webhook_deliveries(shopify_order_id, received_at desc) where shopify_order_id is not null;
create index webhook_deliveries_received_idx on commerce.webhook_deliveries(received_at desc);

create table commerce.orders (
  shopify_order_id bigint primary key check (shopify_order_id > 0),
  -- Merchant-facing order name such as "#1001"; no customer name, email or address.
  name text not null check (length(name) between 1 and 40),
  financial_status text check (financial_status is null or financial_status in ('pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided', 'expired')),
  fulfillment_status text check (fulfillment_status is null or fulfillment_status in ('fulfilled', 'partial', 'restocked', 'unfulfilled')),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  total_minor bigint not null check (total_minor >= 0),
  item_count integer not null check (item_count between 0 and 10000),
  cancelled_at timestamptz,
  shopify_created_at timestamptz not null,
  -- Shopify's own updated_at orders concurrent and out-of-order deliveries.
  shopify_updated_at timestamptz not null,
  recorded_at timestamptz not null default now()
);
create index orders_recent_idx on commerce.orders(shopify_created_at desc, shopify_order_id desc);

alter table commerce.webhook_deliveries enable row level security;
alter table commerce.webhook_deliveries force row level security;
alter table commerce.orders enable row level security;
alter table commerce.orders force row level security;

revoke all on all tables in schema commerce from public, anon, authenticated;
grant select, insert on commerce.webhook_deliveries to chakra_commerce_writer;
grant select, insert, update on commerce.orders to chakra_commerce_writer;
grant select on commerce.orders, commerce.webhook_deliveries to authenticated;

create policy delivery_writer on commerce.webhook_deliveries for all to chakra_commerce_writer using (true) with check (true);
create policy order_writer on commerce.orders for all to chakra_commerce_writer using (true) with check (true);
-- The studio owner (allowlisted, MFA-verified session) can read order state.
create policy delivery_owner on commerce.webhook_deliveries for select to authenticated using ((select studio.is_owner()));
create policy order_owner on commerce.orders for select to authenticated using ((select studio.is_owner()));
