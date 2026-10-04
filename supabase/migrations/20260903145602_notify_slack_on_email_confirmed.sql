create or replace function public.notify_slack_on_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_url text;
begin
  -- Only fire on the null -> not-null transition (first confirmation),
  -- never on later unrelated updates to the row.
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
            ':tada: *New signup confirmed* — %s (confirmed %s)',
            new.email,
            to_char(new.email_confirmed_at, 'YYYY-MM-DD HH24:MI') || ' UTC'
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
  execute function public.notify_slack_on_email_confirmed();