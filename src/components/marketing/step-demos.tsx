"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Check, Copy, Eye } from "lucide-react";
import { FakeCursor } from "@/components/marketing/fake-cursor";
import { cn } from "@/lib/utils";

/**
 * The four "How it works" fragments, each playing a short loop of the real
 * interaction: a title typing itself, a stake being written, a link copied and
 * answered, a day logged.
 *
 * Each loop runs only while its card is on screen and fails to *finished*:
 * the first render (server, no-JS, reduced motion, a background tab) is the
 * completed state, and it only rewinds to the start once we know it's visible
 * and allowed to move.
 */

/* -------------------------------------------------------------------------- */
/*  Playhead                                                                   */
/* -------------------------------------------------------------------------- */

const TICK = 50;

/**
 * Milliseconds into a `length`-ms loop, or `length` (the end state) when the
 * loop isn't running. Plays while the element is at least a third on screen.
 */
function usePlayhead(length: number): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(length);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;
    const start = () => {
      if (timer !== undefined) return;
      setT(0);
      timer = window.setInterval(() => setT((v) => (v + TICK) % length), TICK);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
      setT(length);
    };

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [length]);

  return [ref, t];
}

/** How much of `text` is typed `t` ms in, starting at `from`, `per` ms each. */
function typed(text: string, t: number, from: number, per: number) {
  if (t < from) return "";
  return text.slice(0, Math.floor((t - from) / per) + 1);
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-xs">{children}</p>;
}

/* -------------------------------------------------------------------------- */
/*  1. Set the challenge                                                       */
/* -------------------------------------------------------------------------- */

const TITLE = "Read 20 pages a day";

export function SetChallengeDemo() {
  const [ref, t] = usePlayhead(8000);
  const everyDay = useRef<HTMLSpanElement>(null);
  const days28 = useRef<HTMLSpanElement>(null);

  const text = typed(TITLE, t, 400, 70);
  const typing = t >= 400 && text.length < TITLE.length;
  const pickedDaily = t >= 2700;
  const picked28 = t >= 3900;
  const created = t >= 4600;
  const target = t >= 1900 && t < 3000 ? everyDay : t >= 3000 && t < 4200 ? days28 : null;

  return (
    <div ref={ref} className="relative">
      <Label>What is your challenge?</Label>
      <p className="border-input mt-2 flex min-h-[2.75rem] items-center rounded-xl border px-3.5 text-[15px]">
        <span>{text}</span>
        {(typing || t < 400) && (
          <span className="animate-caret bg-foreground ml-px inline-block h-5 w-px" aria-hidden />
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
        <Chip ref={everyDay} on={pickedDaily} pressed={t >= 2550 && t < 2750}>
          Every day
        </Chip>
        <Chip>Weekdays</Chip>
        <Chip>Weekly</Chip>
        <Chip ref={days28} on={picked28} pressed={t >= 3750 && t < 3950}>
          28 days
        </Chip>
      </div>
      <p
        className={cn(
          "text-success-ink mt-3 flex items-center gap-1.5 text-sm font-medium transition-opacity",
          created ? "animate-pop-in" : "opacity-0",
        )}
      >
        <Check className="size-4" aria-hidden />
        Challenge ready. Next: what&apos;s on the line?
      </p>
      <FakeCursor
        container={ref}
        target={target}
        targetKey={target === everyDay ? 1 : target === days28 ? 2 : 0}
        visible={t >= 1900 && t < 4400}
        pressed={(t >= 2550 && t < 2750) || (t >= 3750 && t < 3950)}
      />
    </div>
  );
}

function Chip({
  ref,
  on = false,
  pressed = false,
  children,
}: {
  ref?: RefObject<HTMLSpanElement | null>;
  on?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      ref={ref}
      className={cn(
        "rounded-full border px-3 py-1.5 transition-[background-color,color,transform] duration-200",
        on ? "bg-foreground text-background border-foreground" : "border-input",
        pressed && "scale-95",
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  2. Name the stake                                                          */
/* -------------------------------------------------------------------------- */

const STAKE = "Lunch on me if I miss a day";

export function StakeDemo() {
  const [ref, t] = usePlayhead(7000);
  const text = typed(STAKE, t, 500, 55);
  const writing = t >= 500 && text.length < STAKE.length;
  const sealed = t >= 2700;
  const seen = t >= 3400;

  return (
    <div ref={ref} className="relative">
      <Label>What&apos;s on the line?</Label>
      <p className="relative mt-2 inline-block font-serif text-[1.75rem] leading-[1.15] italic">
        {text || " "}
        {writing && (
          <span className="animate-caret bg-foreground ml-0.5 inline-block h-6 w-px align-middle" aria-hidden />
        )}
        {/* Underlined once it's committed: a promise, signed. */}
        <span
          aria-hidden
          className="bg-cheer absolute -bottom-0.5 left-0 h-[3px] rounded-full transition-[width] duration-700 ease-out"
          style={{ width: sealed ? "100%" : "0%" }}
        />
      </p>
      <p
        className={cn(
          "text-muted-foreground mt-4 flex items-center gap-2 text-sm",
          seen ? "animate-pop-in" : "opacity-0",
        )}
      >
        <span className="bg-pastel-lavender text-pastel-foreground flex size-6 items-center justify-center rounded-full text-[11px] font-medium">
          S
        </span>
        <span>
          <span className="text-foreground font-medium">Sam</span> can see this
        </span>
        <Eye className="size-3.5" aria-hidden />
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  3. Send the link                                                           */
/* -------------------------------------------------------------------------- */

const REACTIONS = [
  { at: 2600, text: "Sam opened your link", tone: "plain" },
  { at: 3400, text: "Sam cheered you on", tone: "cheer" },
  { at: 4300, text: "Alex nudged you", tone: "cheer" },
] as const;

export function LinkDemo() {
  const [ref, t] = usePlayhead(8000);
  const copyRef = useRef<HTMLSpanElement>(null);
  const copied = t >= 1700;

  return (
    <div ref={ref} className="relative">
      <Label>Invite your buddy</Label>
      <div className="border-input mt-2 flex items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-4 text-sm">
        <span className="text-muted-foreground min-w-0 flex-1 truncate">
          habitual-app-kappa.vercel.app/i/c2749bec
        </span>
        <span
          ref={copyRef}
          className={cn(
            "bg-foreground text-background inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] transition-transform",
            t >= 1500 && t < 1700 && "scale-95",
          )}
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </span>
      </div>
      <div className="mt-3 flex min-h-[4.5rem] flex-wrap content-start gap-2 text-[13px]">
        {REACTIONS.map((r) =>
          t >= r.at ? (
            <span
              key={r.text}
              className={cn(
                "animate-pop-in rounded-full px-3 py-1.5",
                r.tone === "cheer"
                  ? "bg-pastel-amber text-pastel-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {r.text}
            </span>
          ) : null,
        )}
      </div>
      <FakeCursor
        container={ref}
        target={t >= 700 && t < 2000 ? copyRef : null}
        targetKey={t >= 700 && t < 2000 ? 1 : 0}
        visible={t >= 700 && t < 2200}
        pressed={t >= 1500 && t < 1700}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  4. Log each day                                                            */
/* -------------------------------------------------------------------------- */

/** Day 12 of 14: an early miss, a run, today's slot, one still to come. */
const CHAIN = ["k", "x", "k", "k", "k", "k", "k", "k", "k", "k", "k", "n", "u", "u"] as const;

const BURST = [
  [-18, -22], [0, -28], [18, -22], [26, -4], [18, 16], [-18, 16], [-26, -4], [0, 24],
];

export function LogDemo() {
  const [ref, t] = usePlayhead(7000);
  const logRef = useRef<HTMLSpanElement>(null);
  const logged = t >= 1700;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between gap-3">
        <Label>Read 20 pages a day · day 12 of 14</Label>
        <span className="text-xs tabular-nums">
          <span className="text-success-ink font-medium">{logged ? 12 : 11}</span>{" "}
          <span className="text-muted-foreground">day streak</span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-14 gap-1">
        {CHAIN.map((s, i) => {
          const state = s === "n" && logged ? "k" : s;
          return (
            <span key={i} className="relative">
              <span
                className={cn(
                  "block aspect-square rounded-[4px]",
                  state === "k" && "bg-success",
                  state === "k" && s === "n" && "animate-pop-in",
                  state === "x" && "cell-missed",
                  state === "n" && "ring-foreground ring-[1.5px] ring-inset",
                  state === "u" && "ring-border ring-1 ring-inset",
                )}
              />
              {s === "n" && logged && t < 2600 && (
                <span aria-hidden className="pointer-events-none absolute inset-0">
                  {BURST.map(([dx, dy], j) => (
                    <span
                      key={j}
                      className={cn(
                        "animate-burst absolute top-1/2 left-1/2 size-1.5 rounded-full",
                        j % 3 === 0 ? "bg-cheer" : j % 3 === 1 ? "bg-success" : "bg-chart-4",
                      )}
                      style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties}
                    />
                  ))}
                </span>
              )}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex h-8 items-center">
        {logged ? (
          <p className="text-success-ink animate-pop-in text-sm font-medium">
            Day 12 logged. 20 pages read.
          </p>
        ) : (
          <span
            ref={logRef}
            className={cn(
              "bg-foreground text-background inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] transition-transform",
              t >= 1500 && "scale-95",
            )}
          >
            <Check className="size-3.5" aria-hidden />
            Log today
          </span>
        )}
      </div>
      <FakeCursor
        container={ref}
        target={t >= 600 && t < 1700 ? logRef : null}
        targetKey={t >= 600 && t < 1700 ? 1 : 0}
        visible={t >= 600 && t < 1900}
        pressed={t >= 1500 && t < 1700}
      />
    </div>
  );
}
