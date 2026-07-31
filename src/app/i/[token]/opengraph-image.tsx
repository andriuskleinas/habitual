import { ImageResponse } from "next/og";
import {
  evaluateChallenge,
  formatDay,
  periodNoun,
  schedulePeriods,
  todayISO,
} from "@/lib/challenges";
import { fetchInviteCard } from "@/lib/invite";
import { BRAND_GRADIENT, LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo";

export const alt = "A challenge on Habitual";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Re-render at most every 5 minutes per token. A streak moves once a day at
 * most, and a link pasted into a busy group chat can be unfurled dozens of
 * times in a row — no reason for each one to hit the database.
 */
export const revalidate = 300;

const BG = BRAND_GRADIENT;
const DIM = "rgba(255,255,255,0.82)";

/** Longest run of cells that still reads as a chain rather than a texture. */
const MAX_CELLS = 40;

/**
 * Per-invite share card.
 *
 * The whole growth loop starts with a link pasted into a chat, and a link with
 * no preview is a link nobody taps. This is the generic card's job made
 * specific: whose challenge, what they're on the hook for, how they're doing,
 * and what happens if they fail — the four things that make a friend curious
 * enough to open it.
 *
 * Plain inline styles only: the OG renderer supports a small subset of CSS and
 * no Tailwind, and every element with more than one child needs an explicit
 * `display: flex`.
 */
export default async function InviteOpengraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await fetchInviteCard(token);

  // A dead or malformed token still gets a card — an unfurler that receives a
  // 404 shows a bare URL, which looks broken rather than merely expired.
  if (!view) {
    return new ImageResponse(<Fallback />, size);
  }

  const today = todayISO();
  const rules = {
    cadence: view.cadence,
    cadenceWeekday: view.cadence_weekday,
    startDate: view.start_date,
    endDate: view.end_date,
    allowanceMode: view.allowance_mode,
    allowanceValue: view.allowance_value,
    maxMissesInRow: view.max_misses_in_row,
    dailyTarget: view.daily_target,
    totalTarget: view.total_target,
  };
  const rows = view.check_ins ?? [];
  const ev = evaluateChallenge(rules, rows, today);
  const periods = schedulePeriods({ ...rules, today });
  const done = new Set(rows.map((r) => r.date));
  const noun = periodNoun(view.cadence);
  const owner = view.owner_name ?? "Someone";

  const periodIndex = ev.coversToday
    ? Math.min(ev.closedPeriods + 1, ev.totalPeriods ?? Number.MAX_SAFE_INTEGER)
    : null;

  const badge =
    ev.status === "failed"
      ? "STREAK BROKEN"
      : ev.status === "won"
        ? "CHALLENGE COMPLETE"
        : ev.status === "upcoming"
          ? `STARTS ${formatDay(view.start_date, { weekday: true }).toUpperCase()}`
          : periodIndex !== null && ev.totalPeriods !== null
            ? `${noun.one.toUpperCase()} ${periodIndex} OF ${ev.totalPeriods}`
            : "IN PROGRESS";

  // The last stretch of the run — recent slots say more than the opening ones.
  const cells = periods.slice(-MAX_CELLS);
  const cellSize = Math.floor((1056 - (cells.length - 1) * 10) / cells.length);

  // Built as strings rather than sibling spans: satori drops the flex gap
  // around fragment children, which ran the separators into the next word.
  const streakLine = ev.streak > 0 ? `${ev.streak}-${noun.one} streak` : null;
  const restLine = [
    ev.totalPeriods !== null
      ? `${ev.donePeriods} of ${ev.totalPeriods} done`
      : `${ev.donePeriods} done`,
    ev.skipsLeft !== null
      ? `${ev.skipsLeft} ${ev.skipsLeft === 1 ? "skip" : "skips"} left`
      : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const title =
    view.title.length > 58 ? `${view.title.slice(0, 57)}…` : view.title;
  const stake =
    view.stake_text && view.stake_text.length > 64
      ? `${view.stake_text.slice(0, 63)}…`
      : view.stake_text;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "64px 72px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand + state */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "52px",
                height: "52px",
                borderRadius: "15px",
                background: "rgba(255,255,255,0.18)",
              }}
            >
              <svg viewBox={LOGO_VIEWBOX} width={28} height={29} fill="#fff">
                <path d={LOGO_PATH} />
              </svg>
            </div>
            <div
              style={{
                fontSize: "31px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              Habitual
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.18)",
              fontSize: "24px",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {badge}
          </div>
        </div>

        {/* The ask, the challenge, the score */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: "30px", color: DIM }}>
            {owner} asked you to keep them honest
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "70px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              maxWidth: "1000px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "30px",
              color: DIM,
            }}
          >
            {streakLine && (
              <span style={{ color: "white", fontWeight: 600 }}>
                {streakLine}
              </span>
            )}
            <span>{streakLine ? `·  ${restLine}` : restLine}</span>
          </div>

          {stake && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginTop: "6px",
                padding: "16px 24px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.14)",
                maxWidth: "1000px",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: DIM,
                }}
              >
                ON THE LINE
              </span>
              <span style={{ fontSize: "30px", fontWeight: 600 }}>{stake}</span>
            </div>
          )}
        </div>

        {/* The chain, from the real check-in history */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {cells.map((p) => {
            const filled =
              p.start === p.end
                ? done.has(p.start)
                : [...done].some((d) => d >= p.start && d <= p.end);
            const isPast = p.end < today;
            const isNow = p.start <= today && today <= p.end;
            return (
              <div
                key={p.start}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  borderRadius: "7px",
                  background: filled
                    ? "white"
                    : isPast
                      ? "rgba(255,140,140,0.5)"
                      : "rgba(255,255,255,0.22)",
                  border: isNow && !filled ? "3px solid white" : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    ),
    size,
  );
}

/** Shown when the token is unknown or revoked. */
function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "20px",
        background: BG,
        padding: "72px",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: "34px", color: DIM }}>
        Habitual
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "68px",
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        This invite has expired.
      </div>
      <div style={{ display: "flex", fontSize: "30px", color: DIM }}>
        Ask your friend for a fresh link — or start a challenge of your own.
      </div>
    </div>
  );
}
