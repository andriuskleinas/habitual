import { Wordmark } from "@/components/brand";
import { SiteHeaderCta } from "@/components/site-header-cta";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Marketing nav. Sticky so the primary CTA is reachable from any scroll depth —
 * on mobile the section links collapse away and the CTA stays.
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
              className="hover:text-foreground rounded-sm transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <SiteHeaderCta />
        </div>
      </div>
    </header>
  );
}
