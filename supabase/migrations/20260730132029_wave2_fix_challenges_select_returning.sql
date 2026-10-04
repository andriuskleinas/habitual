-- INSERT ... RETURNING (supabase-js .insert().select()) also enforces the SELECT
-- policy on the new row. The prior policy called private.can_view_challenge(id),
-- a STABLE SECURITY DEFINER that re-queries challenges by id; mid-INSERT the new
-- row isn't visible in that function's snapshot, so it returned false and blocked
-- RETURNING. Add direct row-column short-circuits (owner_id / is_public) so the
-- owner + public paths are satisfied from the candidate row itself. The buddy
-- case still routes through the definer helper to avoid recursive RLS on buddies.
alter policy challenges_select_visible on public.challenges
  using (
    owner_id = (select auth.uid())
    or is_public
    or private.can_view_challenge(id)
  );