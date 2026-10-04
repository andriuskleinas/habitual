-- Ensure every existing challenge has at least one pending invite row so the
-- owner always has a shareable link. New challenges get theirs on create.
insert into public.buddies (challenge_id, status)
select c.id, 'pending'
from public.challenges c
where not exists (
  select 1 from public.buddies b where b.challenge_id = c.id
);