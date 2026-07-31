import { Hand, MessageCircle, PartyPopper, Trophy } from "lucide-react";

export type ReactionItem = {
  type: string;
  message: string | null;
  from_name: string | null;
  created_at: string;
};

const META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; verb: string }
> = {
  cheer: { icon: PartyPopper, verb: "cheered" },
  nudge: { icon: Hand, verb: "nudged" },
  reward: { icon: Trophy, verb: "sent a reward" },
  note: { icon: MessageCircle, verb: "left a note" },
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
    <ul className="flex flex-col gap-2">
      {reactions.slice(0, 20).map((r, i) => {
        const meta = META[r.type] ?? META.note;
        const Icon = meta.icon;
        const who = r.from_name ?? "Someone";
        return (
          <li
            key={`${r.created_at}-${i}`}
            className="ring-foreground/10 flex items-start gap-3 rounded-lg px-3 py-2.5 ring-1"
          >
            {/* Amber: a cheer or a nudge is your buddy's voice, and it wears
                the same colour everywhere it appears. */}
            <div className="bg-cheer/20 text-cheer-ink flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <p className="text-sm">
                <span className="font-medium">{who}</span>{" "}
                <span className="text-muted-foreground">{meta.verb}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {timeAgo(r.created_at)}
                </span>
              </p>
              {r.message && (
                <p className="text-muted-foreground text-sm text-pretty">
                  “{r.message}”
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
