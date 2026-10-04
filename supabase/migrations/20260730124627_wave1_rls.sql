-- Wave 1 — Row Level Security (PLAN.md §5)
-- Cross-table visibility checks live in SECURITY DEFINER helpers so policies on
-- challenges/buddies/check_ins/reactions don't recurse into each other's RLS.

create schema if not exists private;

-- Owner check: is the current user the owner of this challenge?
create or replace function private.owns_challenge(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenges c
    where c.id = cid
      and c.owner_id = (select auth.uid())
  );
$$;

-- Visibility check: owner, claimed buddy, or public. (Anon token access is added
-- in Wave 3 via a token RPC — RLS can't read a client-held token.)
create or replace function private.can_view_challenge(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
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

revoke execute on function private.owns_challenge(uuid) from public;
revoke execute on function private.can_view_challenge(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.owns_challenge(uuid) to anon, authenticated;
grant execute on function private.can_view_challenge(uuid) to anon, authenticated;

-- Enable RLS everywhere
alter table public.users      enable row level security;
alter table public.challenges enable row level security;
alter table public.buddies    enable row level security;
alter table public.check_ins  enable row level security;
alter table public.reactions  enable row level security;

-- users: you see and edit only yourself (inserts happen via the definer trigger)
create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));
create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- challenges: readable if owner / claimed buddy / public; writable by owner only
create policy challenges_select_visible on public.challenges
  for select to anon, authenticated
  using (private.can_view_challenge(id));
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

-- buddies: visible to the challenge owner or the buddy themselves; managed by owner
-- (self-service claim lands in Wave 4 via a token RPC)
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

-- check_ins: readable with the challenge; writable by the owner only
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

-- reactions: readable with the challenge; an identified user reacts as themselves
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