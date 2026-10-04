-- pg_net doesn't support SET SCHEMA (relocatable = false); its `net.*`
-- functions always live in a fixed `net` schema regardless of where the
-- extension itself is registered, so the "extension in public" lint for
-- pg_net can't be resolved this way — leaving it as-is, same as any
-- Supabase project using Database Webhooks/pg_cron.

create schema if not exists private;

create or replace function private.notify_slack_on_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_url text;
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    select decrypted_secret into webhook_url
    from vault.decrypted_secrets
    where name = 'slack_signup_webhook_url';

    if webhook_url is not null then
      perform net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'text', format(
            ':tada: *New signup confirmed* — %s (confirmed %s UTC)',
            new.email,
            to_char(new.email_confirmed_at, 'YYYY-MM-DD HH24:MI')
          )
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  execute function private.notify_slack_on_email_confirmed();

drop function if exists public.notify_slack_on_email_confirmed();