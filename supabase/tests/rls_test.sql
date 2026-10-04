-- Access-rule tests. Run with supabase/tests/run.sh against a scratch database.
--
-- Cast: Alice owns a challenge, Bob claims her invite link, Carol is a
-- stranger, and anon is someone holding the link without signing in.
-- Every check raises (and the run stops) on the first broken rule.

\set ON_ERROR_STOP on
\set QUIET on

create function pg_temp.as_user(uid uuid) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  execute format('set role %I', case when uid is null then 'anon' else 'authenticated' end);
end;
$$;

create function pg_temp.check(ok boolean, label text) returns void
language plpgsql
as $$
begin
  if ok is not true then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'ok - %', label;
end;
$$;

-- --------------------------------------------------------------------------
-- Sign-up triggers
-- --------------------------------------------------------------------------

insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000000', 'alice@example.com', 'hash', '{"name": "Alice"}'),
  ('b0000000-0000-0000-0000-000000000000', 'bob@example.com', null, '{}'),
  ('c0000000-0000-0000-0000-000000000000', 'carol@example.com', null, '{"full_name": "Carol C"}');

select pg_temp.check(
  (select name from public.users where id = 'a0000000-0000-0000-0000-000000000000') = 'Alice',
  'signup copies the name from metadata');
select pg_temp.check(
  (select name from public.users where id = 'b0000000-0000-0000-0000-000000000000') = 'bob',
  'signup falls back to the email local part');
select pg_temp.check(
  (select password_set_at is not null from public.users where id = 'a0000000-0000-0000-0000-000000000000')
  and (select password_set_at is null from public.users where id = 'b0000000-0000-0000-0000-000000000000'),
  'password_set_at is stamped only for password signups');

update auth.users set email = 'alice@new.example.com' where id = 'a0000000-0000-0000-0000-000000000000';
select pg_temp.check(
  (select email from public.users where id = 'a0000000-0000-0000-0000-000000000000') = 'alice@new.example.com',
  'an email change is mirrored into public.users');

update auth.users set email_confirmed_at = now() where id = 'c0000000-0000-0000-0000-000000000000';
select pg_temp.check((select count(*) from net.requests) = 0,
  'no Slack post without a webhook secret');
insert into vault.decrypted_secrets values ('slack_signup_webhook_url', 'https://hooks.example.test/x');
update auth.users set email_confirmed_at = now() where id = 'b0000000-0000-0000-0000-000000000000';
select pg_temp.check((select count(*) from net.requests) = 1,
  'a confirmed signup posts to Slack once the secret exists');

-- --------------------------------------------------------------------------
-- Owner
-- --------------------------------------------------------------------------

select pg_temp.as_user('a0000000-0000-0000-0000-000000000000');

insert into public.challenges (id, owner_id, title, stake_text)
  values ('11111111-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Read daily', '€20 to Bob');
insert into public.buddies (challenge_id, invite_token)
  values ('11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000');
insert into public.check_ins (challenge_id, user_id, date)
  values ('11111111-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', '2026-10-05');

do $$
begin
  insert into public.check_ins (challenge_id, user_id, date)
    values ('11111111-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', '2026-10-05');
  raise exception 'FAIL: a second check-in on the same day was accepted';
exception when unique_violation then
  raise notice 'ok - one check-in per challenge per day';
end
$$;

do $$
begin
  insert into public.challenges (owner_id, title)
    values ('b0000000-0000-0000-0000-000000000000', 'Pretending to be Bob');
  raise exception 'FAIL: created a challenge for someone else';
exception when insufficient_privilege then
  raise notice 'ok - cannot create a challenge owned by someone else';
end
$$;

do $$
begin
  insert into public.challenges (owner_id, title, cadence, cadence_weekday)
    values ('a0000000-0000-0000-0000-000000000000', 'Bad weekday', 'daily', 3);
  raise exception 'FAIL: a weekday was accepted on a daily challenge';
exception when check_violation then
  raise notice 'ok - cadence_weekday only allowed with weekly_on';
end
$$;

select pg_temp.check(
  (select claim_invite('22222222-0000-0000-0000-000000000000') ->> 'result') = 'owner',
  'the owner cannot claim their own invite');

-- --------------------------------------------------------------------------
-- Stranger, before anything is shared
-- --------------------------------------------------------------------------

select pg_temp.as_user('c0000000-0000-0000-0000-000000000000');

select pg_temp.check((select count(*) from public.challenges) = 0,
  'a stranger sees no challenges');
select pg_temp.check((select count(*) from public.check_ins) = 0,
  'a stranger sees no check-ins');
select pg_temp.check((select count(*) from public.buddies) = 0,
  'a stranger sees no invite tokens');
select pg_temp.check((select count(*) from public.users) = 1,
  'users can read only their own profile row');
select pg_temp.check(
  reactions_for_challenge('11111111-0000-0000-0000-000000000000') is null,
  'reactions_for_challenge returns nothing to a stranger');

update public.challenges set title = 'hijacked' where id = '11111111-0000-0000-0000-000000000000';
reset role;
select pg_temp.check(
  (select title from public.challenges where id = '11111111-0000-0000-0000-000000000000') = 'Read daily',
  'a stranger cannot edit someone else''s challenge');

-- --------------------------------------------------------------------------
-- Anonymous visitor holding the link
-- --------------------------------------------------------------------------

select pg_temp.as_user(null);

select pg_temp.check((select count(*) from public.challenges) = 0,
  'anon cannot list challenges');
select pg_temp.check(
  (select challenge_by_invite('22222222-0000-0000-0000-000000000000') ->> 'owner_name') = 'Alice',
  'the invite token opens the buddy view, with the owner''s name');
select pg_temp.check(
  challenge_by_invite('99999999-0000-0000-0000-000000000000') is null,
  'a wrong token opens nothing');

do $$
begin
  perform claim_invite('22222222-0000-0000-0000-000000000000');
  raise exception 'FAIL: anon could call claim_invite';
exception when insufficient_privilege then
  raise notice 'ok - anon cannot claim an invite';
end
$$;

-- --------------------------------------------------------------------------
-- Buddy
-- --------------------------------------------------------------------------

select pg_temp.as_user('b0000000-0000-0000-0000-000000000000');

select pg_temp.check(
  (select claim_invite('22222222-0000-0000-0000-000000000000') ->> 'result') = 'claimed',
  'a signed-in user can claim the invite');
select pg_temp.check(
  (select claim_invite('22222222-0000-0000-0000-000000000000') ->> 'result') = 'already',
  'claiming twice is idempotent');
select pg_temp.check((select count(*) from public.challenges) = 1,
  'a claimed buddy can see the challenge');
select pg_temp.check((select count(*) from public.check_ins) = 1,
  'a claimed buddy can see its check-ins');

insert into public.reactions (challenge_id, from_user_id, type, message)
  values ('11111111-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'cheer', 'Go!');
select pg_temp.check(
  (select reactions_for_challenge('11111111-0000-0000-0000-000000000000') -> 0 ->> 'from_name') = 'bob',
  'reactions_for_challenge shows the reactor''s name to a buddy');

do $$
begin
  insert into public.check_ins (challenge_id, user_id, date)
    values ('11111111-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', '2026-10-06');
  raise exception 'FAIL: a buddy logged a check-in on someone else''s challenge';
exception when insufficient_privilege then
  raise notice 'ok - only the owner can check in';
end
$$;

do $$
begin
  insert into public.reactions (challenge_id, from_user_id, type)
    values ('11111111-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'nudge');
  raise exception 'FAIL: reacted as someone else';
exception when insufficient_privilege then
  raise notice 'ok - reactions are always from the signed-in user';
end
$$;

-- --------------------------------------------------------------------------
-- A second person opening the same, already-claimed link
-- --------------------------------------------------------------------------

select pg_temp.as_user('c0000000-0000-0000-0000-000000000000');
select pg_temp.check(
  (select claim_invite('22222222-0000-0000-0000-000000000000') ->> 'result') = 'claimed',
  'a shared link still converts a second buddy');
select pg_temp.check((select count(*) from public.challenges) = 1,
  'the second buddy can now see the challenge');

reset role;
select pg_temp.check(
  (select count(*) from public.buddies where challenge_id = '11111111-0000-0000-0000-000000000000') = 2,
  'the second buddy got their own row');

\echo 'All access-rule tests passed.'
