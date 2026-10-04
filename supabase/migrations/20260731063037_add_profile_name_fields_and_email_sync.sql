-- Profile fields the account page lets people edit. `name` already exists and
-- keeps its meaning (first name); surname and nickname are new and optional.
alter table public.users
  add column if not exists surname text,
  add column if not exists nickname text;

alter table public.users
  drop constraint if exists users_name_length,
  drop constraint if exists users_surname_length,
  drop constraint if exists users_nickname_length;

alter table public.users
  add constraint users_name_length check (name is null or char_length(name) <= 60),
  add constraint users_surname_length check (surname is null or char_length(surname) <= 60),
  add constraint users_nickname_length check (nickname is null or char_length(nickname) <= 40);

-- `public.users.email` was only ever written at signup by handle_new_user, so a
-- confirmed email change in auth.users left our mirror stale. Keep them in step.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

-- Trigger-only, exactly like handle_new_user: nothing should be able to call it
-- directly through PostgREST.
revoke execute on function public.handle_user_email_change() from public;
revoke execute on function public.handle_user_email_change() from anon;
revoke execute on function public.handle_user_email_change() from authenticated;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();