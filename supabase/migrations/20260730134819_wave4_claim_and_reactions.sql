-- Wave 4: growth loop — invite claim + buddy reactions.

-- claim_invite: an authenticated user claims a buddy invite by its token.
-- SECURITY DEFINER so it can write buddies regardless of RLS; the logic below
-- enforces who may claim (must be signed in, cannot be the owner, idempotent
-- per user). Returns { result, challenge_id? }.
create or replace function public.claim_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
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

revoke execute on function public.claim_invite(uuid) from public, anon;
grant execute on function public.claim_invite(uuid) to authenticated;

-- Extend the anon token view: add viewer flags (so a signed-in visitor's page
-- can branch owner/buddy) and a reactions wall with author names.
create or replace function public.challenge_by_invite(p_token uuid)
returns jsonb
language sql
stable security definer
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

-- Reactions for the owner/buddy detail views, with author names. Direct RLS
-- select can't read other users' names (users_select_own), so this definer
-- gate returns names only to a challenge's owner or a claimed buddy.
create or replace function public.reactions_for_challenge(p_challenge_id uuid)
returns jsonb
language sql
stable security definer
set search_path = ''
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

revoke execute on function public.reactions_for_challenge(uuid) from public, anon;
grant execute on function public.reactions_for_challenge(uuid) to authenticated;