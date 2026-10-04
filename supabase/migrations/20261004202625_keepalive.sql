-- Keep-alive heartbeat.
--
-- Supabase pauses Free Plan projects with too little database activity over
-- 7 days. A plain anonymous REST read (what the first keep-alive did) wasn't
-- enough: the project paused twice within 5 days of a successful ping. So
-- every ping now calls this RPC, which does a real write to a one-row table.
--
-- Callable by anon because the pingers (GitHub Actions, Vercel Cron) only hold
-- the public key. It can't be abused for anything beyond bumping a timestamp:
-- the table always holds exactly one row, and `source` is clipped.

create table private.heartbeat (
  id        smallint primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now(),
  source    text
);

insert into private.heartbeat default values;

-- Not exposed through the Data API (private schema), and no direct grants:
-- the RPC below is the only way in.
revoke all on table private.heartbeat from public, anon, authenticated;

create or replace function public.keepalive(p_source text default null)
returns timestamptz
language sql
volatile security definer
set search_path to ''
as $$
  update private.heartbeat
    set pinged_at = now(), source = left(p_source, 32)
    where id = 1
  returning pinged_at;
$$;

revoke all on function public.keepalive(text) from public;
grant execute on function public.keepalive(text) to anon, authenticated, service_role;
