-- handle_new_user only ever runs from the on_auth_user_created trigger; it should
-- not be callable directly via PostgREST. Trigger execution is unaffected by this.
revoke execute on function public.handle_new_user() from public, anon, authenticated;