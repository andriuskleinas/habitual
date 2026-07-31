"use client";

import { useMemo, useRef, useState } from "react";
import { Smile } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * A deliberately small, curated set rather than the full Unicode catalogue:
 * every emoji here is one someone might actually pick for a habit or a stake,
 * so the grid stays scannable and we ship no emoji data file.
 *
 * Each entry is [character, search keywords].
 */
const EMOJI_GROUPS: { name: string; emojis: [string, string][] }[] = [
  {
    name: "Move",
    emojis: [
      ["💪", "muscle strength gym lift"],
      ["🏃", "run running jog cardio"],
      ["🚶", "walk walking steps"],
      ["🚴", "bike cycling ride"],
      ["🏋️", "weights gym lift"],
      ["🧘", "yoga meditate calm stretch"],
      ["🏊", "swim swimming pool"],
      ["🤸", "stretch gymnastics mobility"],
      ["🥊", "boxing fight"],
      ["⚽", "football soccer"],
      ["🏀", "basketball hoops"],
      ["🎾", "tennis"],
    ],
  },
  {
    name: "Health",
    emojis: [
      ["🥗", "salad healthy eat food"],
      ["🥦", "broccoli vegetables veg greens"],
      ["🍎", "apple fruit"],
      ["💧", "water hydrate drink"],
      ["😴", "sleep rest bed early"],
      ["🚭", "quit smoking nosmoking"],
      ["🦷", "teeth floss brush dentist"],
      ["🧴", "skincare routine"],
      ["❤️", "heart health love"],
      ["🩺", "doctor health checkup"],
    ],
  },
  {
    name: "Mind",
    emojis: [
      ["📚", "books read reading study"],
      ["📖", "book read pages"],
      ["✍️", "write writing journal"],
      ["🧠", "brain learn think mind"],
      ["💻", "code work laptop build"],
      ["🎓", "study school learn course"],
      ["📝", "notes journal todo"],
      ["🗓️", "calendar plan schedule"],
      ["⏰", "alarm early time wake"],
      ["🎯", "target goal focus aim"],
      ["📈", "chart progress growth up"],
      ["🌍", "language travel world"],
      ["🎧", "podcast listen audio"],
      ["🧩", "puzzle problem"],
    ],
  },
  {
    name: "Make",
    emojis: [
      ["🎨", "art paint draw create"],
      ["🎸", "guitar music practice"],
      ["🎹", "piano music keys"],
      ["📷", "photo camera shoot"],
      ["🎬", "film video edit"],
      ["🎤", "sing music voice"],
      ["✏️", "sketch draw pencil"],
      ["🪄", "magic craft"],
    ],
  },
  {
    name: "Stakes",
    emojis: [
      ["💸", "money cash spend pay"],
      ["💰", "money savings bag"],
      ["💳", "card pay bill"],
      ["🍕", "pizza food treat"],
      ["🍔", "burger food"],
      ["🍺", "beer drink pub"],
      ["☕", "coffee drink"],
      ["🍦", "icecream dessert treat"],
      ["🎁", "gift present reward"],
      ["🏆", "trophy win prize"],
      ["🎟️", "ticket show"],
      ["🧾", "receipt bill tab"],
    ],
  },
  {
    name: "Fuel",
    emojis: [
      ["🔥", "fire streak hot"],
      ["⚡", "energy fast power"],
      ["✨", "sparkle shine"],
      ["🌟", "star great"],
      ["🚀", "rocket launch go"],
      ["💯", "hundred perfect"],
      ["😤", "determined push"],
      ["🥶", "cold freeze"],
      ["😭", "cry fail sad"],
      ["🙈", "shame hide oops"],
      ["🤝", "deal handshake buddy"],
      ["👀", "eyes watching"],
      ["🫡", "salute respect"],
      ["✅", "check done complete"],
      ["⛔", "no stop never"],
      ["🏳️", "surrender quit give up"],
    ],
  },
];

const COLUMNS = 8;

export function EmojiPicker({
  onSelect,
  onClosed,
  label,
  className,
}: {
  onSelect: (emoji: string) => void;
  /**
   * Fired once the popover has closed and Radix has finished with focus —
   * the only safe moment to put the caret back in the field being edited.
   */
  onClosed?: () => void;
  /** Describes which field this picker fills, e.g. "the challenge title". */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_GROUPS;
    return EMOJI_GROUPS.map((g) => ({
      ...g,
      emojis: g.emojis.filter(([, keywords]) => keywords.includes(q)),
    })).filter((g) => g.emojis.length > 0);
  }, [query]);

  function choose(emoji: string) {
    onSelect(emoji);
    setOpen(false);
    setQuery("");
  }

  /** Arrow keys walk the grid — a 60-cell tab stop run is not navigation. */
  function onGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    const cells = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-emoji]") ?? [],
    );
    const index = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    e.preventDefault();
    const step =
      e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowLeft"
          ? -1
          : e.key === "ArrowDown"
            ? COLUMNS
            : -COLUMNS;
    const next = cells[Math.min(cells.length - 1, Math.max(0, index + step))];
    next?.focus();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={`Add an emoji to ${label}`}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
      >
        <Smile className="size-4" aria-hidden />
      </PopoverTrigger>

      <PopoverContent
        className="w-[19.5rem]"
        // Radix would return focus to the trigger; the field being edited is a
        // far better home for it. Taking over here (rather than in a rAF from
        // the click handler) means we run *after* the layer is torn down, so
        // nothing can steal the focus back.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onClosed?.();
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Enter inside a popover should never reach the surrounding form.
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Search emoji"
          aria-label="Search emoji"
          className="h-9 text-sm"
        />

        <div
          ref={gridRef}
          onKeyDown={onGridKeyDown}
          className="mt-2 max-h-64 overflow-y-auto pr-0.5"
        >
          {groups.length === 0 ? (
            <p className="text-muted-foreground px-1 py-6 text-center text-sm">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="mb-1.5 last:mb-0">
                <p className="text-muted-foreground px-1 pb-1 text-[0.7rem] font-medium tracking-wide uppercase">
                  {group.name}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emojis.map(([char, keywords]) => (
                    <button
                      key={char}
                      type="button"
                      data-emoji
                      aria-label={keywords.split(" ")[0]}
                      onClick={() => choose(char)}
                      className="hover:bg-accent focus-visible:ring-ring flex aspect-square items-center justify-center rounded-md text-xl leading-none transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
