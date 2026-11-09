/**
 * Challenge categories, inferred from the title.
 *
 * There is no category column: people name challenges the way they talk
 * ("Run 5 km daily 🏃", "Cold plunge daily 🥶"), and that's enough to sort
 * them. Inferring keeps every existing challenge grouped on day one with zero
 * extra questions in the create form. If a picker is ever added, store its
 * answer and fall back to this.
 *
 * Order matters: the first category whose pattern matches wins. Health sits
 * before food so "drink water" is hydration, and fitness goes first so
 * "walk after dinner" is exercise, not a meal.
 */

export type CategoryId =
  | "fitness"
  | "health"
  | "food"
  | "mind"
  | "learning"
  | "other";

export type Category = {
  id: CategoryId;
  label: string;
  /** Tailwind background class for the category's dot and bar segment. */
  dot: string;
};

export const CATEGORIES: Category[] = [
  { id: "fitness", label: "Sport & fitness", dot: "bg-chart-4" },
  { id: "health", label: "Health & recovery", dot: "bg-chart-5" },
  { id: "food", label: "Food & nutrition", dot: "bg-chart-3" },
  { id: "mind", label: "Mind & focus", dot: "bg-chart-1" },
  { id: "learning", label: "Reading & learning", dot: "bg-chart-2" },
  { id: "other", label: "Other", dot: "bg-muted-foreground/50" },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryById(id: CategoryId): Category {
  return BY_ID.get(id)!;
}

/** Word patterns per category. `\b` keeps "ran" out of "orange". */
const RULES: [CategoryId, RegExp][] = [
  [
    "fitness",
    /\b(run|runs|running|jog\w*|\d+\s?k|\d+\s?km|marathon|walk\w*|steps?|push[\s-]?ups?|pull[\s-]?ups?|squats?|planks?|burpees?|sit[\s-]?ups?|gym|workouts?|exercis\w*|lift\w*|weights?|yoga|pilates|swim\w*|cycl\w*|bike|biking|sports?|train\w*|cardio|abs|hik\w*|football|soccer|tennis|padel|climb\w*|boxing|stretch\w*)\b|🏃|🏋|💪|🚴|🏊|⚽|🎾|🧗|🤸|🥊/u,
  ],
  [
    "health",
    /\b(sleep\w*|bed(time)?|wake|water|hydrat\w*|vitamins?|supplements?|cold|plunge|ice bath|sauna|shower|floss\w*|teeth|skin\s?care|smok\w*|vap\w*|sunlight|posture)\b|🥶|💧|😴|🛌|🦷/u,
  ],
  [
    "food",
    /\b(cook\w*|meals?|eat\w*|sugar|snacks?|veg\w*|fruit|salad|diet|fast\w*|protein|alcohol|beer|wine|booze|junk|takeaway|breakfast|lunch|dinner|caffeine)\b|🥦|🥗|🍎|🍳|🥕/u,
  ],
  [
    "mind",
    /\b(meditat\w*|mindful\w*|journal\w*|gratitude|breath\w*|phone|screens?|social media|instagram|tiktok|doomscroll\w*|focus\w*|pray\w*|therapy|digital detox)\b|🧘|📵|🙏|🧠/u,
  ],
  [
    "learning",
    /\b(read\w*|pages?|books?|chapters?|novel|learn\w*|stud(y|ies|ying)|lessons?|courses?|languages?|spanish|french|german|italian|duolingo|vocab\w*|biology|history|math\w*|code|coding|program\w*|practi[cs]e|piano|guitar|write|writing|words|blog)\b|📚|📖|✍️|🎹|🎸/u,
  ],
];

export function categorize(title: string): CategoryId {
  const t = title.toLowerCase();
  for (const [id, re] of RULES) {
    if (re.test(t)) return id;
  }
  return "other";
}
