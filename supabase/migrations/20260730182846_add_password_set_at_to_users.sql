-- Tracks whether a user has DELIBERATELY set a password.
--
-- This cannot be derived from auth.users: GoTrue writes a 60-char bcrypt hash
-- for magic-link-only users too, so `encrypted_password is null` is always
-- false and tells us nothing. We need our own fact to know whether to offer a
-- buddy "finish your account" (set a password) vs "change password".
--
-- Nullable with no default => metadata-only ALTER, no table rewrite.
-- Existing rows stay NULL, which correctly reads as "magic-link only".
-- No index: only ever read via the owner's primary-key row lookup.
-- No new policy: `users_update_own` already allows a user to write their row.
alter table public.users
  add column if not exists password_set_at timestamptz;

comment on column public.users.password_set_at is
  'When the user set a password via the app. NULL = magic-link only (auth.users.encrypted_password is unreliable for this).';