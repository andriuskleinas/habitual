-- Wave 3: anon-readable challenge view by invite token.
-- RLS can't read a client-held token, so we expose a SECURITY DEFINER RPC that
-- returns a read-only snapshot of a challenge ONLY when the caller presents a
-- matching invite_token. Runs as the definer (bypasses RLS); the token IS the
-- authorization. search_path is pinned empty so every object is schema-qualified.
create or replace function public.challenge_by_invite(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'cadence', c.cadence,
    'daily_target', c.daily_target,
    'start_date', c.start_date,
    'end_date', c.end_date,
    'stake_text', c.stake_text,
    'owner_name', u.name,
    'invite_status', b.status,
    'buddy_claimed', (b.buddy_user_id is not null),
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
    )
  )
  from public.buddies b
  join public.challenges c on c.id = b.challenge_id
  left join public.users u on u.id = c.owner_id
  where b.invite_token = p_token
  limit 1;
$$;

-- Callable by unauthenticated visitors (the whole point) and signed-in users.
revoke all on function public.challenge_by_invite(uuid) from public;
grant execute on function public.challenge_by_invite(uuid) to anon, authenticated;