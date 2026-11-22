create table studio.reading_drafts (
  reading_id text primary key references catalog.readings(id) on delete cascade,
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 24576)
);
alter table studio.reading_drafts enable row level security;
revoke all on studio.reading_drafts from public, anon, authenticated;
grant select, insert, update, delete on studio.reading_drafts to authenticated;
create policy reading_drafts_owner on studio.reading_drafts for all to authenticated
  using ((select studio.owner_session(true)))
  with check ((select studio.owner_session(true)));
