-- A challenge can now be measured by a RUNNING TOTAL across the whole run
-- ("read 3000 pages in 6 months") rather than a per-check-in target. On a long
-- challenge the compounding number is what matters; an individual skipped day
-- can be made up later.
--
-- The mode is derived, not stored: total_target set => total goal; else
-- daily_target > 1 => per-check-in number; else a plain done/not-done tick.

alter table public.challenges
  add column if not exists total_target integer;

comment on column public.challenges.total_target is
  'Cumulative target across the whole challenge (sum of check_ins.value). NULL = measured per check-in instead.';

alter table public.challenges
  drop constraint if exists challenges_total_target_check;

alter table public.challenges
  add constraint challenges_total_target_check
    check (total_target is null or (total_target >= 1 and total_target <= 10000000));