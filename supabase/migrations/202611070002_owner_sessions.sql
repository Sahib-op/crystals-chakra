-- Session-sensitive authorization. Managed Auth tables are read, never altered.
create function studio.owner_session(require_mfa boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from studio.owner_access a
    join auth.users u on u.id=a.user_id
    join auth.sessions s on s.user_id=u.id
    where a.active and a.user_id=(select auth.uid())
      and s.id=case when ((select auth.jwt())->>'session_id') ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
        then ((select auth.jwt())->>'session_id')::uuid else null end
      and not coalesce(u.is_anonymous,false)
      and (u.banned_until is null or u.banned_until <= now())
      and (s.not_after is null or s.not_after > now())
      and (not require_mfa or (
        ((select auth.jwt())->>'aal')='aal2' and s.aal::text='aal2'
        and exists(select 1 from auth.mfa_factors f where f.user_id=u.id and f.status::text='verified')
      ))
  );
$$;
revoke all on function studio.owner_session(boolean) from public, anon;
grant execute on function studio.owner_session(boolean) to authenticated;
create or replace function studio.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select studio.owner_session(true);
$$;

-- Guard publishing rules at the database boundary as well as in the API.
create function catalog.check_reading_publication() returns trigger
language plpgsql set search_path = '' as $$ begin
  if new.status='published' then
    perform pg_advisory_xact_lock(hashtextextended('chakra_catalogue_publish',0));
    if new.type='tarot' and new.practitioner_id is null then
      raise check_violation using message='A published tarot reading needs a practitioner';
    end if;
    if new.practitioner_id is not null and not exists(select 1 from catalog.practitioners p where p.id=new.practitioner_id and p.published) then
      raise check_violation using message='Publish the practitioner first';
    end if;
    if (select count(*) from catalog.readings where status='published' and id<>new.id) >= 40 then
      raise check_violation using message='Published catalogue limit reached';
    end if;
  end if;
  return new;
end $$;
create function catalog.check_practitioner_publication() returns trigger
language plpgsql set search_path = '' as $$ begin
  if old.published and not new.published and exists(select 1 from catalog.readings where practitioner_id=new.id and status='published') then
    raise check_violation using message='Archive linked readings before unpublishing their practitioner';
  end if;
  return new;
end $$;
revoke all on function catalog.check_reading_publication(), catalog.check_practitioner_publication() from public, anon, authenticated;
create trigger reading_publication before insert or update on catalog.readings for each row execute function catalog.check_reading_publication();
create trigger practitioner_publication before update on catalog.practitioners for each row execute function catalog.check_practitioner_publication();
