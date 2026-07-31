"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import {
  createChallenge,
  type CreateChallengeState,
} from "@/app/challenges/actions";
import {
  addDays,
  cadenceLabel,
  cadenceNeedsWeekday,
  CADENCES,
  describeAllowance,
  DURATIONS,
  durationLabel,
  formatCount,
  formatDay,
  resolveSkipsAllowed,
  resolveStartDate,
  schedulePeriods,
  START_OPTIONS,
  WEEKDAYS,
  type AllowanceMode,
} from "@/lib/challenges";
import { EmojiPicker } from "@/components/emoji-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Skips can be a flat number, a share of the run, or simply not a thing. */
const SKIP_MODES = [
  { value: "count", label: "A number" },
  { value: "percent", label: "A %" },
  { value: "none", label: "No limit" },
] as const;

type SkipMode = (typeof SKIP_MODES)[number]["value"];

const IN_A_ROW = [
  { value: "", label: "No back-to-back rule" },
  { value: "1", label: "Never miss twice in a row" },
  { value: "2", label: "Never miss 3 times in a row" },
] as const;

/**
 * How the challenge is scored. `total` is the compounding option: on a long run
 * the number you end up with matters more than any single day you skipped.
 */
const GOAL_MODES = [
  { value: "tick", label: "Tick it off" },
  { value: "each", label: "Each time" },
  { value: "total", label: "Running total" },
] as const;

type GoalModeValue = (typeof GOAL_MODES)[number]["value"];

const TITLE_MAX = 80;
const STAKE_MAX = 200;

type Field = HTMLInputElement | HTMLTextAreaElement | null;

/**
 * Drop `emoji` in at the caret, replacing any selection. Returns the new value
 * plus where the caret should end up, so the caller can restore it once the
 * picker has closed. Respects the field's `maxLength`, which a programmatic
 * value change would otherwise sail straight past.
 */
function insertAtCaret(
  el: Field,
  value: string,
  max: number,
  emoji: string,
): { value: string; caret: number | null } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + emoji + value.slice(end);
  if (next.length > max) return { value, caret: null };
  return { value: next, caret: start + emoji.length };
}

/** Put the cursor back where the emoji left it, so you can keep typing. */
function restoreCaret(el: Field, caret: number | null) {
  if (!el) return;
  el.focus();
  if (caret !== null) el.setSelectionRange(caret, caret);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {pending ? "Creating…" : "Create challenge"}
    </Button>
  );
}

/** Radio group styled as a segmented control — real radios, so it posts natively. */
function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
  label,
}: {
  name: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="bg-muted inline-flex shrink-0 rounded-lg p-0.5"
    >
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            // The visible text lives in a sibling span, so name the input itself.
            aria-label={o.label}
            className="peer sr-only"
          />
          <span className="peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-xs peer-focus-visible:ring-ring peer-focus-visible:ring-2 text-muted-foreground block rounded-md px-2.5 py-1 text-xs font-medium transition-colors">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function CreateChallengeForm({ today }: { today: string }) {
  const [state, formAction] = useActionState<CreateChallengeState, FormData>(
    createChallenge,
    {},
  );

  const [title, setTitle] = useState("");
  const [stake, setStake] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const stakeRef = useRef<HTMLTextAreaElement>(null);
  // Where the caret should land once the emoji popover finishes closing.
  const pendingCaret = useRef<number | null>(null);

  const [cadence, setCadence] = useState<string>("daily");
  const [weekday, setWeekday] = useState(1);
  const [startWhen, setStartWhen] = useState<string>("today");
  const [duration, setDuration] = useState(28);
  const [mode, setMode] = useState<GoalModeValue>("tick");
  const [target, setTarget] = useState(20);
  const [totalTarget, setTotalTarget] = useState(1000);
  const [unit, setUnit] = useState("");
  const [skipMode, setSkipMode] = useState<SkipMode>("count");
  const [skipValue, setSkipValue] = useState(3);
  const [inARow, setInARow] = useState<string>("");

  const needsWeekday = cadenceNeedsWeekday(cadence);

  // Everything below is a preview of what the server will build. The start date
  // is resolved from the *server's* idea of today (passed in) so the plan the
  // user reads is the plan they get.
  const startDate = resolveStartDate(startWhen, today);
  const endDate = addDays(startDate, duration - 1);
  const totalPeriods = schedulePeriods({
    cadence,
    cadenceWeekday: weekday,
    startDate,
    endDate,
  }).length;
  const skipsAllowed =
    skipMode === "none"
      ? null
      : resolveSkipsAllowed(skipMode as AllowanceMode, skipValue, totalPeriods);
  const tooShort = totalPeriods === 0;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">What is your challenge?</Label>
        <div className="relative">
          <Input
            id="title"
            name="title"
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Read 20 pages"
            required
            minLength={3}
            maxLength={TITLE_MAX}
            autoFocus
            className="pr-10"
          />
          <EmojiPicker
            label="the challenge title"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onSelect={(emoji) => {
              const next = insertAtCaret(
                titleRef.current,
                title,
                TITLE_MAX,
                emoji,
              );
              setTitle(next.value);
              pendingCaret.current = next.caret;
            }}
            onClosed={() => restoreCaret(titleRef.current, pendingCaret.current)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cadence">How often</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            id="cadence"
            name="cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
          >
            {CADENCES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          {needsWeekday && (
            <Select
              name="cadence_weekday"
              aria-label="Which day"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className="sm:w-44"
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}s
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start_when">Starting</Label>
          <Select
            id="start_when"
            name="start_when"
            value={startWhen}
            onChange={(e) => setStartWhen(e.target.value)}
          >
            {START_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duration">For how long</Label>
          <Select
            id="duration"
            name="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d.days} value={d.days}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="daily_target">How you&apos;ll measure it</Label>
          <Segmented
            name="goal_mode"
            label="How to measure it"
            options={GOAL_MODES}
            value={mode}
            onChange={(v) => {
              setMode(v);
              // A running total is explicitly forgiving about individual days,
              // so a skip budget would contradict it. Drop the limit when the
              // user opts in — they can still put one back.
              if (v === "total") setSkipMode("none");
            }}
          />
        </div>

        {mode === "tick" ? (
          <p className="text-muted-foreground text-xs">
            Done or not done. Nothing to count.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                id="daily_target"
                name={mode === "total" ? "total_target" : "daily_target"}
                type="number"
                inputMode="numeric"
                min={1}
                max={mode === "total" ? 10000000 : 100000}
                value={mode === "total" ? totalTarget : target}
                onChange={(e) =>
                  mode === "total"
                    ? setTotalTarget(Number(e.target.value))
                    : setTarget(Number(e.target.value))
                }
                className="w-32"
                aria-label={mode === "total" ? "Total to reach" : "How many each time"}
              />
              <Input
                name="target_unit"
                placeholder="pages"
                maxLength={24}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                aria-label="Unit"
              />
            </div>
            <p className="text-muted-foreground text-xs text-pretty">
              {mode === "total" ? (
                <>
                  The number you finish with is what counts — skip a day, make
                  it up later.
                  {totalPeriods > 0 && totalTarget > 0 && (
                    <>
                      {" "}
                      That&apos;s about{" "}
                      <span className="text-foreground font-medium">
                        {formatCount(
                          Math.ceil(totalTarget / totalPeriods),
                          unit.trim() || undefined,
                        )}
                      </span>{" "}
                      per check-in.
                    </>
                  )}
                </>
              ) : (
                <>Hit this every single time. e.g. 20 pages, 100 push-ups.</>
              )}
            </p>
          </>
        )}
      </div>

      <fieldset className="border-border/70 flex flex-col gap-4 rounded-xl border border-dashed p-4">
        <legend className="px-1.5 text-sm font-medium">Wiggle room</legend>
        <p className="text-muted-foreground -mt-1 text-xs text-pretty">
          Life happens. Decide up front how much slack you get — go past it and
          the challenge is marked failed.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="allowance_value">Skips allowed</Label>
            <Segmented
              name="allowance_mode"
              label="How to count skips"
              options={SKIP_MODES}
              value={skipMode}
              onChange={setSkipMode}
            />
          </div>
          {skipMode !== "none" && (
            <div className="flex items-center gap-2">
              <Input
                id="allowance_value"
                name="allowance_value"
                type="number"
                inputMode="numeric"
                min={0}
                max={skipMode === "percent" ? 50 : 365}
                value={skipValue}
                onChange={(e) => setSkipValue(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                {skipMode === "percent"
                  ? `% of check-ins${
                      skipsAllowed !== null ? ` — that's ${skipsAllowed}` : ""
                    }`
                  : skipValue === 1
                    ? "skip"
                    : "skips"}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_misses_in_row">Back-to-back</Label>
          <Select
            id="max_misses_in_row"
            name="max_misses_in_row"
            value={inARow}
            onChange={(e) => setInARow(e.target.value)}
          >
            {IN_A_ROW.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stake_text">What&apos;s on the line?</Label>
        <div className="relative">
          <Textarea
            id="stake_text"
            name="stake_text"
            ref={stakeRef}
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="Lunch on me if I blow it."
            required
            minLength={3}
            maxLength={STAKE_MAX}
            rows={2}
            className="pr-10"
          />
          <EmojiPicker
            label="the stake"
            className="absolute top-1.5 right-1.5"
            onSelect={(emoji) => {
              const next = insertAtCaret(
                stakeRef.current,
                stake,
                STAKE_MAX,
                emoji,
              );
              setStake(next.value);
              pendingCaret.current = next.caret;
            }}
            onClosed={() => restoreCaret(stakeRef.current, pendingCaret.current)}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Make it sting a little. If you fail, your buddy gets to collect.
        </p>
      </div>

      {/* The whole plan in plain English, so nobody has to reverse-engineer
          six dropdowns to know what they just signed up for. */}
      <div
        className="bg-accent/50 text-accent-foreground flex flex-col gap-1 rounded-xl px-4 py-3 text-sm text-pretty"
        aria-live="polite"
      >
        {tooShort ? (
          <p>
            <span className="font-semibold">Hmm — that&apos;s too short.</span>{" "}
            {cadenceLabel(cadence, weekday)} doesn&apos;t fit a single check-in
            into {durationLabel(duration)}. Stretch it out or check in more
            often.
          </p>
        ) : (
          <>
            <p>
              <span className="font-semibold">
                {cadenceLabel(cadence, weekday)}
              </span>{" "}
              from {formatDay(startDate, { weekday: true })} to{" "}
              {formatDay(endDate)}.
            </p>
            <p className="text-accent-foreground/85">
              {totalPeriods} check-in{totalPeriods === 1 ? "" : "s"}
              {mode === "total"
                ? `, ${formatCount(totalTarget, unit.trim() || undefined)} in total`
                : mode === "each"
                  ? `, ${formatCount(target, unit.trim() || undefined)} each time`
                  : ""}
              .{" "}
              {mode === "total" ? "Hit the total and you win, even early. " : ""}
              {describeAllowance({
                skipsAllowed,
                maxMissesInRow: inARow ? Number(inARow) : null,
                cadence,
              })}
            </p>
          </>
        )}
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
