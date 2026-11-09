export type ReactionItem = {
  type: string;
  message: string | null;
  from_name: string | null;
  created_at: string;
};

const VERB: Record<string, string> = {
  cheer: "cheered",
  nudge: "nudged",
  reward: "sent a reward",
  note: "left a note",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** Shared reactions wall for the buddy (invite) and owner (detail) views. */
export function ReactionsFeed({ reactions }: { reactions: ReactionItem[] }) {
  if (reactions.length === 0) return null;

  return (
    <ul className="divide-border flex flex-col divide-y">
      {reactions.slice(0, 20).map((r, i) => {
        const verb = VERB[r.type] ?? VERB.note;
        const who = r.from_name ?? "Someone";
        return (
          <li
            key={`${r.created_at}-${i}`}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            {/* Amber: a cheer or a nudge is your buddy's voice, and it wears
                the same colour everywhere it appears. */}
            <span
              className="bg-pastel-amber text-pastel-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium uppercase"
              aria-hidden
            >
              {who.slice(0, 1)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm">
                <span className="font-medium">{who}</span>{" "}
                <span className="text-cheer-ink">{verb}</span>
                <span className="text-muted-foreground text-xs">
                  {" · "}
                  {timeAgo(r.created_at)}
                </span>
              </p>
              {r.message && (
                <p className="text-muted-foreground text-sm text-pretty break-words">
                  {r.message}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
