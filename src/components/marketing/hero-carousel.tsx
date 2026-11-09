"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { celebrateCheckIn } from "@/lib/confetti";
import { FakeCursor } from "@/components/marketing/fake-cursor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The hero: five challenges on a turntable.
 *
 * Whichever card is in the middle plays a short story about one thing the
 * product does (a pointer checks in, the day fills, the streak ticks over, a
 * buddy reacts) and then the table turns to the next. Hovering the middle card
 * pauses it (so its check-in button, the real one, can be pressed) and tilts
 * it toward the pointer; side cards lift on hover and come to the front on
 * click, after which the table keeps turning from there.
 *
 * It only stops for good when someone asks it to: the pause button (WCAG
 * 2.2.2), or keyboard focus inside it. Mouse clicks on the arrows and dots
 * don't count as focus, or one click would freeze it forever. With reduced
 * motion it still advances, but the turn and the tilt are instant.
 *
 * Illustrative throughout: sample challenges, not an account.
 */

type Slot = "k" | "x" | "n" | "u"; // kept, missed, now (open), upcoming
type Pastel = "lavender" | "amber" | "sky" | "mint";

type Showcase = {
  id: string;
  title: string;
  meta: string;
  pastel: Pastel;
  unit: "day" | "week";
  streak: number;
  history: string;
  action: string;
  stake: string;
  buddy: { name: string; before: string; after: string };
  total?: { done: number; step: number; target: number; unit: string };
};

const CARDS: Showcase[] = [
  {
    id: "read",
    title: "Read 20 pages a day",
    meta: "Day 14 of 28",
    pastel: "sky",
    unit: "day",
    streak: 11,
    history: "kxkkkkkkkkkkkn",
    action: "Check in for today",
    stake: "Lunch on me if I miss a day",
    buddy: {
      name: "Sam",
      before: "nudged you: “day 12 won’t log itself.”",
      after: "cheered: “12 days straight, don’t stop!”",
    },
  },
  {
    id: "run",
    title: "Run 5k on Saturdays",
    meta: "Week 4 of 8",
    pastel: "amber",
    unit: "week",
    streak: 3,
    history: "kkknuuuu",
    action: "Log this week’s run",
    stake: "Post-run coffees are on me",
    buddy: {
      name: "Alex",
      before: "is watching your Saturdays",
      after: "cheered: “Four weeks in a row. Legs of steel.”",
    },
  },
  {
    id: "phone",
    title: "No phone after 10pm",
    meta: "Day 7 of 21",
    pastel: "mint",
    unit: "day",
    streak: 6,
    history: "kkkkkknuuuuuuu",
    action: "Check in for tonight",
    stake: "Dishes for a week",
    buddy: {
      name: "Mia",
      before: "nudged you: “Phone in the drawer?”",
      after: "cheered: “A full week offline after ten!”",
    },
  },
  {
    id: "meditate",
    title: "Meditate 10 minutes",
    meta: "Day 6 of 30",
    pastel: "lavender",
    unit: "day",
    streak: 5,
    history: "kkkkknuuuuuuuu",
    action: "Check in for today",
    stake: "Breakfast on me",
    buddy: {
      name: "Jo",
      before: "is watching",
      after: "left a note: “Same time tomorrow?”",
    },
  },
  {
    id: "write",
    title: "Write 300 words",
    meta: "Running total · day 12",
    pastel: "amber",
    unit: "day",
    streak: 10,
    history: "kxkkkkkkkkknuu",
    action: "Log 300 words",
    stake: "I’ll buy the book you pick",
    buddy: {
      name: "Lee",
      before: "is reading along",
      after: "cheered: “3,600 words. Chapter one is real.”",
    },
    total: { done: 3300, step: 300, target: 9000, unit: "words" },
  },
];

const PASTEL: Record<Pastel, string> = {
  lavender: "bg-pastel-lavender",
  amber: "bg-pastel-amber",
  sky: "bg-pastel-sky",
  mint: "bg-pastel-mint",
};

/**
 * The story the middle card plays, as (time, phase). 0 rest, 1 pointer
 * arrives, 2 click, 3 logged, 4 buddy reacts, then the table turns.
 */
const STEPS: { at: number; phase: number | "next" }[] = [
  { at: 1000, phase: 1 },
  { at: 1800, phase: 2 },
  { at: 2000, phase: 3 },
  { at: 2900, phase: 4 },
  { at: 5800, phase: "next" },
];
const atOf = (phase: number) => STEPS.find((s) => s.phase === phase)?.at ?? 0;

export function HeroCarousel() {
  const n = CARDS.length;
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(true); // until we know, no tilt
  const [hidden, setHidden] = useState(false);
  const [manual, setManual] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const vis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  const paused = hovered || focused || userPaused || hidden;

  // Schedule the next beat of the story from wherever it currently is, so a
  // pause in the middle resumes rather than restarts.
  useEffect(() => {
    if (paused) return;
    const next = STEPS.find((s) => s.at > atOf(phase));
    if (!next) return;
    const id = window.setTimeout(() => {
      if (next.phase === "next") {
        setActive((a) => (a + 1) % n);
        setPhase(0);
        setManual(false);
        setHovered(false);
      } else {
        setPhase(next.phase);
        // The scripted check-in celebrates like a real one, but only while
        // the hero is actually on screen: confetti raining over the FAQ
        // because a card offscreen "logged" would be noise.
        if (next.phase === 3 && onScreen(regionRef.current)) {
          void celebrateCheckIn(CARDS[active].streak + 1);
        }
      }
    }, next.at - atOf(phase));
    return () => window.clearTimeout(id);
  }, [paused, phase, active, n]);

  function go(i: number) {
    setActive(((i % n) + n) % n);
    setPhase(0);
    setManual(false);
    // The card that was in the middle moves away under the pointer and never
    // gets a mouseleave, so clear the hover pause here.
    setHovered(false);
  }

  function logByHand() {
    const card = CARDS[active];
    setManual(true);
    setPhase(3);
    void celebrateCheckIn(card.streak + 1);
    window.setTimeout(() => setPhase((p) => (p === 3 ? 4 : p)), 900);
  }

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Example challenges"
      // Keyboard focus only: a mouse click leaves focus on the arrow it hit,
      // which would otherwise pause the table until the visitor clicks away.
      onFocus={(e) => {
        if ((e.target as HTMLElement).matches(":focus-visible")) setFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {/* Layout knobs per breakpoint: how far apart, how far down, how much
          smaller and how faded each step away from the middle is. On a phone
          only the middle card shows. */}
      <div className="relative h-[29rem] [--drop:0rem] [--fade1:1] [--fade2:0] [--shrink:0.1] [--step:0rem] [perspective:1400px] sm:[--fade1:0] sm:[--fade2:1] sm:[--step:15rem] lg:h-[31rem] lg:[--drop:4.5rem] lg:[--fade2:0.3] lg:[--shrink:0.2] lg:[--step:20rem] xl:[--step:21.5rem]">
        {CARDS.map((card, i) => {
          let o = i - active;
          if (o > n / 2) o -= n;
          if (o < -n / 2) o += n;
          return (
            <TurntableCard
              key={card.id}
              card={card}
              offset={o}
              phase={o === 0 ? phase : 0}
              manual={o === 0 && manual}
              tilt={!reduced}
              onHover={o === 0 ? setHovered : undefined}
              onBring={() => go(i)}
              onLog={logByHand}
              onAgain={() => {
                setPhase(0);
                setManual(false);
              }}
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => go(active - 1)}
          aria-label="Previous challenge"
          className="text-ink-muted hover:text-ink-foreground flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="flex items-center gap-1.5">
          {CARDS.map((card, i) => (
            <button
              key={card.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show “${card.title}”`}
              aria-current={i === active ? "true" : undefined}
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                i === active ? "bg-ink-foreground w-6" : "w-2 bg-white/30 hover:bg-white/50",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(active + 1)}
          aria-label="Next challenge"
          className="text-ink-muted hover:text-ink-foreground flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
        <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-pressed={userPaused}
            aria-label={userPaused ? "Play the demo" : "Pause the demo"}
            className="text-ink-muted hover:text-ink-foreground ml-2 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            {userPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TurntableCard({
  card,
  offset,
  phase,
  manual,
  tilt,
  onHover,
  onBring,
  onLog,
  onAgain,
}: {
  card: Showcase;
  offset: number;
  phase: number;
  manual: boolean;
  tilt: boolean;
  /** Only the middle card pauses the table while hovered. */
  onHover?: (hovering: boolean) => void;
  onBring: () => void;
  onLog: () => void;
  onAgain: () => void;
}) {
  const center = offset === 0;
  const abs = Math.abs(offset);
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Follow the pointer with a small 3D tilt. Written straight to CSS
  // variables so a mouse move doesn't re-render React.
  function onMove(e: React.MouseEvent) {
    if (!center || !tilt || !tiltRef.current) return;
    const r = tiltRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tiltRef.current.style.setProperty("--ry", `${x * 8}deg`);
    tiltRef.current.style.setProperty("--rx", `${-y * 8}deg`);
  }
  function onLeave() {
    tiltRef.current?.style.setProperty("--ry", "0deg");
    tiltRef.current?.style.setProperty("--rx", "0deg");
    onHover?.(false);
  }

  return (
    <div
      ref={cardRef}
      data-side={center ? undefined : ""}
      className={cn(
        "turntable-card absolute top-0 left-1/2 h-[27rem] w-[min(22rem,calc(100vw-2.5rem))]",
        // Out of reach where they're invisible (phones, and the far pair
        // below desktop width).
        abs === 1 && "max-sm:pointer-events-none",
        abs === 2 && "max-lg:pointer-events-none",
      )}
      style={{ "--o": offset, "--abs": abs } as React.CSSProperties}
      onMouseEnter={() => onHover?.(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        ref={tiltRef}
        className="relative size-full rounded-[28px] transition-transform duration-200 ease-out [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        {/* The front: the full, playable challenge. */}
        <div
          inert={!center}
          className={cn(
            "bg-card text-card-foreground absolute inset-0 rounded-[28px] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] transition-opacity duration-500",
            center ? "opacity-100" : "opacity-0",
          )}
        >
          <Front card={card} phase={phase} manual={manual} onLog={onLog} onAgain={onAgain} cardRef={cardRef} />
        </div>

        {/* The back: a compact pastel summary, for the cards waiting their
            turn. */}
        <div
          aria-hidden
          className={cn(
            "text-pastel-foreground absolute inset-0 flex flex-col justify-between rounded-[28px] p-6 text-left transition-opacity duration-500",
            PASTEL[card.pastel],
            center ? "opacity-0" : "opacity-100",
          )}
        >
          <p className="text-[1.375rem] leading-tight tracking-[-0.025em]">{card.title}</p>
          <div>
            <p className="text-7xl leading-[0.9] tracking-[-0.05em] tabular-nums">
              {card.total ? card.total.done.toLocaleString("en-US") : card.streak}
            </p>
            <p className="mt-1 text-sm opacity-70">
              {card.total ? `${card.total.unit} so far` : `${card.unit} streak`}
            </p>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {card.history.slice(0, 7).split("").map((s, i) => (
                <span
                  key={i}
                  className={cn(
                    "aspect-square rounded-[5px]",
                    s === "k" && "bg-pastel-foreground/70",
                    s === "x" && "bg-miss",
                    (s === "n" || s === "u") && "ring-pastel-foreground/30 ring-1 ring-inset",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {!center && (
          <button
            type="button"
            onClick={onBring}
            aria-label={`Show “${card.title}”`}
            className="absolute inset-0 z-10 cursor-pointer rounded-[28px]"
          />
        )}
      </div>
    </div>
  );
}

function Front({
  card,
  phase,
  manual,
  onLog,
  onAgain,
  cardRef,
}: {
  card: Showcase;
  phase: number;
  manual: boolean;
  onLog: () => void;
  onAgain: () => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logged = phase >= 3;
  const reacted = phase >= 4;
  const streak = logged ? card.streak + 1 : card.streak;
  const slots = card.history.split("") as Slot[];
  const kept = slots.filter((s) => s === "k").length + (logged ? 1 : 0);
  const total = useCountUp(
    card.total ? card.total.done + (logged ? card.total.step : 0) : 0,
  );

  return (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-[17px] tracking-[-0.02em]">{card.title}</p>
        <p className="text-muted-foreground shrink-0 text-xs tabular-nums">{card.meta}</p>
      </div>

      <p className="mt-4 flex items-baseline gap-2.5">
        <span
          key={logged ? "after" : "before"}
          className="text-success-ink animate-pop-in text-7xl leading-[0.85] tracking-[-0.05em] tabular-nums"
        >
          {card.total ? total.toLocaleString("en-US") : streak}
        </span>
        <span className="text-muted-foreground text-[15px]">
          {card.total ? `of ${card.total.target.toLocaleString("en-US")} ${card.total.unit}` : `${card.unit} streak`}
        </span>
      </p>

      <div
        className="mt-5 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {slots.map((s, i) => {
          const state = s === "n" && logged ? "k" : s;
          return (
            <span
              key={i}
              className={cn(
                "aspect-square rounded-[4px]",
                state === "k" && "bg-success",
                state === "k" && s === "n" && "animate-pop-in",
                state === "x" && "cell-missed",
                state === "n" && "ring-foreground ring-[1.5px] ring-inset",
                state === "u" && "ring-border ring-1 ring-inset",
              )}
            />
          );
        })}
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-[11px] tabular-nums">
        <span>{card.unit === "week" ? "Week 1" : "Two weeks ago"}</span>
        <span>
          {kept} of {slots.length} kept
        </span>
      </div>

      <div className="mt-5 flex h-12 items-center gap-2">
        {logged ? (
          <>
            <p
              className="text-success-ink animate-pop-in flex min-w-0 items-center gap-1.5 text-sm font-medium"
              role={manual ? "status" : undefined}
            >
              <Check className="size-4 shrink-0" aria-hidden />
              <span className="truncate">
                {card.total
                  ? `Logged ${card.total.step} ${card.total.unit}.`
                  : `Logged. ${streak} ${card.unit}s in a row.`}
              </span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground ml-auto shrink-0"
              onClick={onAgain}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Again
            </Button>
          </>
        ) : (
          <Button
            ref={buttonRef}
            type="button"
            size="xl"
            className={cn("w-full transition-transform", phase === 2 && "scale-[0.97]")}
            onClick={onLog}
          >
            <Check className="size-5" aria-hidden />
            {card.action}
          </Button>
        )}
      </div>

      <dl className="border-border mt-auto grid gap-2 border-t pt-4 text-[13px]">
        <div className="flex gap-3">
          <dt className="text-cheer-ink w-14 shrink-0 pt-px text-[11px] font-medium tracking-[0.08em] uppercase">
            Stake
          </dt>
          <dd className="text-muted-foreground">{card.stake}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-cheer-ink w-14 shrink-0 pt-px text-[11px] font-medium tracking-[0.08em] uppercase">
            Buddy
          </dt>
          <dd
            key={reacted ? "after" : "before"}
            className={cn("text-muted-foreground text-pretty", reacted && "animate-pop-in")}
          >
            <span className="text-foreground font-medium">{card.buddy.name}</span>{" "}
            {reacted ? card.buddy.after : card.buddy.before}
          </dd>
        </div>
      </dl>

      <FakeCursor
        container={cardRef}
        target={phase >= 1 && phase <= 2 ? buttonRef : null}
        targetKey={phase}
        visible={!manual && phase >= 1 && phase <= 2}
        pressed={phase === 2}
      />
    </div>
  );
}

/** At least half of `el` is inside the viewport. */
function onScreen(el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  return visible >= r.height / 2;
}

/** Animate a number toward `value` over ~600ms. */
function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}
