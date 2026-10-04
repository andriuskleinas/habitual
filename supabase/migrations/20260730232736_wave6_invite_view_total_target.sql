-- Surface total_target on the buddy (token) view so a watcher sees the same
-- goal the owner set.
create or replace function public.challenge_by_invite(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
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
$function$;