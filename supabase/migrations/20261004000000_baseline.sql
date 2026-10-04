-- Habitual baseline schema.
--
-- The schema was originally built up by applying SQL straight to the hosted
-- project, with no migration history. This file is a snapshot of that live
-- schema (exported from the catalogs on 2026-10-04), so a fresh Supabase
-- project can be brought to the same state in one step. New changes go in new,
-- later-timestamped files next to this one.
--
-- Shape:
--   users       1:1 with auth.users, kept in sync by triggers
--   challenges  owned by a user; status is derived in the app, never stored
--   buddies     one invite token per row; claimed rows link a buddy account
--   check_ins   one per challenge per day (unique constraint, not an upsert)
--   reactions   cheer / nudge / reward / note from a signed-in viewer
--
-- Authorization is row-level security. Policies call two SECURITY DEFINER
-- helpers in the `private` schema (not exposed through the Data API), and the
-- few cross-user reads the app needs go through narrow RPCs instead of
-- broader table grants.

-- --------------------------------------------------------------------------
-- Extensions
-- --------------------------------------------------------------------------

-- Only the Slack signup alert at the bottom needs pg_net.
create extension if not exists pg_net;

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

create table public.users (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  name            text,
  created_at      timestamptz not null default now(),
  password_set_at timestamptz,
  surname         text,
  nickname        text,
  constraint users_name_length     check (name is null or char_length(name) <= 60),
  constraint users_surname_length  check (surname is null or char_length(surname) <= 60),
  constraint users_nickname_length check (nickname is null or char_length(nickname) <= 40)
);

create table public.challenges (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.users (id) on delete cascade,
  title             text not null,
  cadence           text not null default 'daily',
  daily_target      integer not null default 1,
  start_date        date not null default current_date,
  end_date          date,
  is_public         boolean not null default false,
  stake_text        text,
  created_at        timestamptz not null default now(),
  cadence_weekday   smallint,
  target_unit       text,
  allowance_mode    text,
  allowance_value   integer,
  max_misses_in_row smallint,
  total_target      integer,
  constraint challenges_cadence_check check (
    cadence in ('daily', 'weekdays', 'weekly', 'weekly_on', 'biweekly', 'monthly')
  ),
  -- A weekday only makes sense for "once a week on a set day". 0 = Sunday.
  constraint challenges_cadence_weekday_check check (
    cadence_weekday is null
    or (cadence = 'weekly_on' and cadence_weekday between 0 and 6)
  ),
  -- Skip budget: both null (unlimited), or a count up to 365 / a percentage.
  constraint challenges_allowance_check check (
    (allowance_mode is null and allowance_value is null)
    or (
      allowance_mode in ('count', 'percent')
      and allowance_value >= 0
      and allowance_value <= case when allowance_mode = 'percent' then 100 else 365 end
    )
  ),
  constraint challenges_max_misses_in_row_check check (
    max_misses_in_row is null or max_misses_in_row between 1 and 10
  ),
  constraint challenges_target_unit_check check (
    target_unit is null or char_length(target_unit) between 1 and 24
  ),
  constraint challenges_total_target_check check (
    total_target is null or total_target between 1 and 10000000
  )
);

create table public.buddies (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  invite_token  uuid not null default gen_random_uuid(),
  buddy_user_id uuid references public.users (id) on delete set null,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  constraint buddies_invite_token_key unique (invite_token),
  constraint buddies_status_check check (status in ('pending', 'claimed'))
);

create table public.check_ins (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  date         date not null default current_date,
  value        integer not null default 1,
  note         text,
  created_at   timestamptz not null default now(),
  constraint check_ins_challenge_id_date_key unique (challenge_id, date)
);

create table public.reactions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  check_in_id  uuid references public.check_ins (id) on delete cascade,
  from_user_id uuid not null references public.users (id) on delete cascade,
  type         text not null,
  message      text,
  created_at   timestamptz not null default now(),
  constraint reactions_type_check check (type in ('cheer', 'nudge', 'reward', 'note'))
);

-- Foreign-key indexes (Postgres doesn't create these on its own).
create index challenges_owner_id_idx on public.challenges using btree (owner_id);
create index buddies_challenge_id_idx on public.buddies using btree (challenge_id);
create index buddies_buddy_user_idx on public.buddies using btree (buddy_user_id);
create index check_ins_challenge_idx on public.check_ins using btree (challenge_id);
create index check_ins_user_id_idx on public.check_ins using btree (user_id);
create index reactions_challenge_idx on public.reactions using btree (challenge_id);
create index reactions_check_in_idx on public.reactions using btree (check_in_id);
create index reactions_from_user_idx on public.reactions using btree (from_user_id);

alter table public.users      enable row level security;
alter table public.challenges enable row level security;
alter table public.buddies    enable row level security;
alter table public.check_ins  enable row level security;
alter table public.reactions  enable row level security;

-- --------------------------------------------------------------------------
-- Policy helpers (private schema, so they aren't callable over the Data API)
-- --------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- SECURITY DEFINER so policies on one table can look at another without
-- recursing through that table's own policies.
create or replace function private.owns_challenge(cid uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.challenges c
    where c.id = cid
      and c.owner_id = (select auth.uid())
  );
$$;

create or replace function private.can_view_challenge(cid uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.challenges c
    where c.id = cid
      and (
        c.owner_id = (select auth.uid())
        or c.is_public
        or exists (
          select 1 from public.buddies b
          where b.challenge_id = c.id
            and b.buddy_user_id = (select auth.uid())
            and b.status = 'claimed'
        )
      )
  );
$$;

revoke all on function private.owns_challenge(uuid) from public;
revoke all on function private.can_view_challenge(uuid) from public;
grant execute on function private.owns_challenge(uuid) to anon, authenticated;
grant execute on function private.can_view_challenge(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Policies
-- --------------------------------------------------------------------------

-- users: self only. Nobody can read another person's row; see the RPCs below.
create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));
create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- challenges
create policy challenges_select_visible on public.challenges
  for select to anon, authenticated
  using (owner_id = (select auth.uid()) or is_public or private.can_view_challenge(id));
create policy challenges_insert_own on public.challenges
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy challenges_update_own on public.challenges
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy challenges_delete_own on public.challenges
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- buddies: the owner manages invites; a buddy can see their own row.
create policy buddies_select_related on public.buddies
  for select to authenticated
  using (private.owns_challenge(challenge_id) or buddy_user_id = (select auth.uid()));
create policy buddies_insert_owner on public.buddies
  for insert to authenticated
  with check (private.owns_challenge(challenge_id));
create policy buddies_update_owner on public.buddies
  for update to authenticated
  using (private.owns_challenge(challenge_id))
  with check (private.owns_challenge(challenge_id));
create policy buddies_delete_owner on public.buddies
  for delete to authenticated
  using (private.owns_challenge(challenge_id));

-- check_ins: visible to anyone who can see the challenge, written by the owner.
create policy check_ins_select_visible on public.check_ins
  for select to anon, authenticated
  using (private.can_view_challenge(challenge_id));
create policy check_ins_insert_owner on public.check_ins
  for insert to authenticated
  with check (private.owns_challenge(challenge_id) and user_id = (select auth.uid()));
create policy check_ins_update_owner on public.check_ins
  for update to authenticated
  using (private.owns_challenge(challenge_id))
  with check (private.owns_challenge(challenge_id));
create policy check_ins_delete_owner on public.check_ins
  for delete to authenticated
  using (private.owns_challenge(challenge_id));

-- reactions: any signed-in viewer of the challenge can react as themselves.
create policy reactions_select_visible on public.reactions
  for select to anon, authenticated
  using (private.can_view_challenge(challenge_id));
create policy reactions_insert_identified on public.reactions
  for insert to authenticated
  with check (from_user_id = (select auth.uid()) and private.can_view_challenge(challenge_id));
create policy reactions_update_author on public.reactions
  for update to authenticated
  using (from_user_id = (select auth.uid()))
  with check (from_user_id = (select auth.uid()));
create policy reactions_delete_author on public.reactions
  for delete to authenticated
  using (from_user_id = (select auth.uid()));

-- --------------------------------------------------------------------------
-- RPCs: the only cross-user read paths
-- --------------------------------------------------------------------------

-- The public buddy view. Holding the invite token is the credential, so this
-- is callable by anon and returns just what that page renders, including the
-- owner's display name (which no table policy would expose).
create or replace function public.challenge_by_invite(p_token uuid)
returns jsonb
language sql
stable security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'cadence', c.cadence,
    'cadence_weekday', c.cadence_weekday,
    'daily_target', c.daily_target,
    'total_target', c.total_target,
    'target_unit', c.target_unit,
    'start_date', c.start_date,
    'end_date', c.end_date,
    'allowance_mode', c.allowance_mode,
    'allowance_value', c.allowance_value,
    'max_misses_in_row', c.max_misses_in_row,
    'stake_text', c.stake_text,
    'owner_name', u.name,
    'invite_status', b.status,
    'buddy_claimed', (b.buddy_user_id is not null),
    'viewer_is_owner', (c.owner_id = (select auth.uid())),
    'viewer_is_buddy', exists (
      select 1 from public.buddies b2
      where b2.challenge_id = c.id
        and b2.buddy_user_id = (select auth.uid())
        and b2.status = 'claimed'
    ),
    'check_ins', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('date', ci.date, 'value', ci.value, 'note', ci.note)
                 order by ci.date desc
               )
        from public.check_ins ci
        where ci.challenge_id = c.id
      ),
      '[]'::jsonb
    ),
    'reactions', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'type', r.type,
                   'message', r.message,
                   'from_name', ru.name,
                   'created_at', r.created_at
                 )
                 order by r.created_at desc
               )
        from public.reactions r
        left join public.users ru on ru.id = r.from_user_id
        where r.challenge_id = c.id
      ),
      '[]'::jsonb
    )
  )
  from public.buddies b
  join public.challenges c on c.id = b.challenge_id
  left join public.users u on u.id = c.owner_id
  where b.invite_token = p_token
  limit 1;
$$;

-- Turn an invite token into a buddy relationship for the signed-in user.
create or replace function public.claim_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_buddy_id uuid;
  v_existing uuid;
  v_challenge uuid;
  v_owner uuid;
begin
  if v_uid is null then
    return jsonb_build_object('result', 'unauthenticated');
  end if;

  select b.id, b.buddy_user_id, c.id, c.owner_id
    into v_buddy_id, v_existing, v_challenge, v_owner
  from public.buddies b
  join public.challenges c on c.id = b.challenge_id
  where b.invite_token = p_token
  limit 1;

  if v_challenge is null then
    return jsonb_build_object('result', 'not_found');
  end if;

  -- You can't be your own accountability buddy.
  if v_owner = v_uid then
    return jsonb_build_object('result', 'owner', 'challenge_id', v_challenge);
  end if;

  -- Already a buddy on this challenge (this row or any other) — idempotent.
  if exists (
    select 1 from public.buddies b2
    where b2.challenge_id = v_challenge
      and b2.buddy_user_id = v_uid
  ) then
    return jsonb_build_object('result', 'already', 'challenge_id', v_challenge);
  end if;

  if v_existing is null then
    -- The invite slot is open: fill it (the classic single-buddy claim).
    update public.buddies
      set buddy_user_id = v_uid, status = 'claimed'
      where id = v_buddy_id;
  else
    -- Slot already taken by someone else: attach this user as an additional
    -- buddy so any share of the link still converts into a real relationship.
    insert into public.buddies (challenge_id, buddy_user_id, status)
      values (v_challenge, v_uid, 'claimed');
  end if;

  return jsonb_build_object('result', 'claimed', 'challenge_id', v_challenge);
end;
$$;

-- Reactions with the reactor's display name, for the owner and claimed buddies.
create or replace function public.reactions_for_challenge(p_challenge_id uuid)
returns jsonb
language sql
stable security definer
set search_path to ''
as $$
  select case
    when exists (
      select 1 from public.challenges c
      where c.id = p_challenge_id
        and (
          c.owner_id = (select auth.uid())
          or exists (
            select 1 from public.buddies b
            where b.challenge_id = c.id
              and b.buddy_user_id = (select auth.uid())
              and b.status = 'claimed'
          )
        )
    )
    then coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', r.id,
                   'type', r.type,
                   'message', r.message,
                   'from_name', ru.name,
                   'created_at', r.created_at
                 )
                 order by r.created_at desc
               )
        from public.reactions r
        left join public.users ru on ru.id = r.from_user_id
        where r.challenge_id = p_challenge_id
      ),
      '[]'::jsonb
    )
    else null
  end;
$$;

revoke all on function public.challenge_by_invite(uuid) from public;
revoke all on function public.claim_invite(uuid) from public, anon;
revoke all on function public.reactions_for_challenge(uuid) from public, anon;
grant execute on function public.challenge_by_invite(uuid) to anon, authenticated, service_role;
grant execute on function public.claim_invite(uuid) to authenticated, service_role;
grant execute on function public.reactions_for_challenge(uuid) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Keep public.users in sync with auth.users
-- --------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.users (id, email, name, password_set_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    -- A password provided at signup (as opposed to magic-link-only) already
    -- lands in encrypted_password on this same row, so password_set_at can be
    -- stamped here instead of only ever being set later by the account/password
    -- flow. Without this, every password-signup user sees a false "add a
    -- password" nudge forever.
    case when new.encrypted_password is not null and new.encrypted_password <> '' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.handle_user_email_change() to service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- --------------------------------------------------------------------------
-- Optional: Slack alert on each confirmed signup
-- --------------------------------------------------------------------------

-- Posts to the webhook stored in Vault as `slack_signup_webhook_url`. With no
-- such secret it does nothing, so this is safe to apply as-is. To turn it on:
--   select vault.create_secret('https://hooks.slack.com/services/…', 'slack_signup_webhook_url');
create or replace function private.notify_slack_on_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  webhook_url text;
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    select decrypted_secret into webhook_url
    from vault.decrypted_secrets
    where name = 'slack_signup_webhook_url';

    if webhook_url is not null then
      perform net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'text', format(
            ':tada: *New signup confirmed* — %s (confirmed %s UTC)',
            new.email,
            to_char(new.email_confirmed_at, 'YYYY-MM-DD HH24:MI')
          )
        )
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function private.notify_slack_on_email_confirmed();
