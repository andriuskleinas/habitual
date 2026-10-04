-- Just enough of a Supabase project for the migrations to apply to a plain
-- Postgres: the API roles, auth.users + auth.uid(), Vault and pg_net.
-- Only for local and CI testing; never apply this to a real project.
--
-- The migration's `create extension pg_net` line is stripped by the test
-- runner (see supabase/tests/run.sh); net.http_post is stubbed below instead.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb
);

-- Same contract as Supabase: the caller's id comes from the request JWT.
create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase keeps extensions out of public; the first migration installs
-- pgcrypto there.
create schema extensions;

create schema vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);

create schema net;
create table net.requests (id bigserial primary key, url text, body jsonb);
create function net.http_post(url text, headers jsonb, body jsonb) returns bigint
language sql
as $$
  insert into net.requests (url, body) values (url, body) returning id;
$$;

-- Supabase grants the API roles access to everything in public by default.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
