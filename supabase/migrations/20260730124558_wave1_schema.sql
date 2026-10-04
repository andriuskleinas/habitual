-- Wave 1 — core data model (PLAN.md §5)
-- One symmetric users table mirrored from auth.users; challenges own everything else.

create extension if not exists pgcrypto with schema extensions;

-- users: profile row per auth user (id === auth.users.id)
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  name       text,
  created_at timestamptz not null default now()
);

-- challenges: the thing being tracked; owned by one user
create table public.challenges (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.users (id) on delete cascade,
  title        text not null,
  cadence      text not null default 'daily',
  daily_target integer not null default 1,
  start_date   date not null default current_date,
  end_date     date,
  is_public    boolean not null default false,
  stake_text   text,
  created_at   timestamptz not null default now()
);

-- buddies: relationship row (never a copy) pointing at ONE challenge
create table public.buddies (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  invite_token  uuid not null unique default gen_random_uuid(),
  buddy_user_id uuid references public.users (id) on delete set null,
  status        text not null default 'pending' check (status in ('pending', 'claimed')),
  created_at    timestamptz not null default now()
);

-- check_ins: owner's daily log; one per challenge per day
create table public.check_ins (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  date         date not null default current_date,
  value        integer not null default 1,
  note         text,
  created_at   timestamptz not null default now(),
  unique (challenge_id, date)
);

-- reactions: buddy feedback; requires an identified user
create table public.reactions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  check_in_id  uuid references public.check_ins (id) on delete cascade,
  from_user_id uuid not null references public.users (id) on delete cascade,
  type         text not null check (type in ('cheer', 'nudge', 'reward', 'note')),
  message      text,
  created_at   timestamptz not null default now()
);

-- Index every FK + RLS-referenced column (Postgres does not do this automatically)
create index challenges_owner_id_idx  on public.challenges (owner_id);
create index buddies_challenge_id_idx on public.buddies (challenge_id);
create index buddies_buddy_user_idx   on public.buddies (buddy_user_id);
create index check_ins_challenge_idx  on public.check_ins (challenge_id);
create index check_ins_user_id_idx    on public.check_ins (user_id);
create index reactions_challenge_idx  on public.reactions (challenge_id);
create index reactions_check_in_idx   on public.reactions (check_in_id);
create index reactions_from_user_idx  on public.reactions (from_user_id);

-- Mirror new auth users into public.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();