import { Wordmark } from "@/components/brand";
import { SiteHeaderCta } from "@/components/site-header-cta";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Marketing nav. Sticky so the primary CTA is reachable from any scroll depth —
 * on mobile the section links collapse away and the CTA stays.
 *
 * No theme switch: dark mode is an account feature, and it lives in one place,
 * the picker on /account. A visitor who hasn't signed up has nothing to toggle.
 */
export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Wordmark />

        <nav
          aria-label="Sections"
          className="text-muted-foreground ml-6 hidden items-center gap-6 text-sm md:flex"
        >
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              // The underline grows from the left on hover — a nav link that
              // only changes colour is easy to miss mid-scroll.
              className="hover:text-foreground relative rounded-sm py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SiteHeaderCta />
        </div>
      </div>
    </header>
  );
}
