-- Wave 6: richer cadences (a specific weekday, fortnightly, monthly) and an
-- explicit "how much slipping is allowed before this counts as failed" rule.
--
-- Nullable allowance columns mean "no limit", so every pre-existing challenge
-- keeps its old, unfailable behaviour without a backfill.

alter table public.challenges
  add column if not exists cadence_weekday   smallint,
  add column if not exists target_unit       text,
  add column if not exists allowance_mode    text,
  add column if not exists allowance_value   integer,
  add column if not exists max_misses_in_row smallint;

comment on column public.challenges.cadence_weekday is
  'Day of week for the weekly_on cadence. 0=Sunday … 6=Saturday (matches JS getUTCDay).';
comment on column public.challenges.target_unit is
  'Optional unit for daily_target, e.g. pages / minutes / push-ups.';
comment on column public.challenges.allowance_mode is
  'How allowance_value is read: count = that many skips, percent = that share of scheduled periods. NULL = unlimited skips.';
comment on column public.challenges.max_misses_in_row is
  'Longest run of missed periods still allowed. Exceeding it fails the challenge. NULL = no back-to-back rule.';

alter table public.challenges
  drop constraint if exists challenges_cadence_check,
  drop constraint if exists challenges_cadence_weekday_check,
  drop constraint if exists challenges_allowance_check,
  drop constraint if exists challenges_max_misses_in_row_check,
  drop constraint if exists challenges_target_unit_check;

alter table public.challenges
  add constraint challenges_cadence_check
    check (cadence in ('daily', 'weekdays', 'weekly', 'weekly_on', 'biweekly', 'monthly')),
  -- A weekday only means something for the "every <weekday>" cadence.
  add constraint challenges_cadence_weekday_check
    check (
      cadence_weekday is null
      or (cadence = 'weekly_on' and cadence_weekday between 0 and 6)
    ),
  -- mode and value travel together: both set, or both null (= unlimited).
  add constraint challenges_allowance_check
    check (
      (allowance_mode is null and allowance_value is null)
      or (
        allowance_mode in ('count', 'percent')
        and allowance_value >= 0
        and allowance_value <= case when allowance_mode = 'percent' then 100 else 365 end
      )
    ),
  add constraint challenges_max_misses_in_row_check
    check (max_misses_in_row is null or max_misses_in_row between 1 and 10),
  add constraint challenges_target_unit_check
    check (target_unit is null or char_length(target_unit) between 1 and 24);