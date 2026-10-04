
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.users (id, email, name, password_set_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    -- A password provided at signup (as opposed to magic-link-only) already
    -- lands in encrypted_password on this same row, so password_set_at can be
    -- stamped here instead of only ever being set later by the account/password
    -- flow. Without this, every password-signup user sees a false "add a
    -- password" nudge forever.
    case when new.encrypted_password is not null and new.encrypted_password <> '' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$
