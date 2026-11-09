import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/brand";

const REPO = "https://github.com/andriuskleinas/habitual";

type FooterLink = { label: string; href: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "FAQ", href: "/#faq" },
      { label: "Start a challenge", href: "/signup" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create an account", href: "/signup" },
      { label: "Reset your password", href: "/forgot-password" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "Source on GitHub", href: REPO, external: true },
      { label: "MIT licence", href: `${REPO}/blob/main/LICENSE`, external: true },
    ],
  },
];

/**
 * Marketing footer, on the same ink as the closing section above it.
 *
 * A brand column, three short link columns, a small-print row, and the name
 * set huge and faint along the bottom edge, cropped by the page: the same
 * oversized type the hero opens with, closing the page as a signature.
 */
export function SiteFooter() {
  return (
    <footer className="band-ink border-ink-line relative overflow-hidden border-t">
      <div className="mx-auto w-full max-w-6xl px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))] md:gap-8">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Link
              href="/"
              className="flex w-fit items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
            >
              <LogoMark tone="inverse" />
              <span className="text-lg font-medium tracking-[-0.03em]">Habitual</span>
            </Link>
            <p className="text-ink-muted max-w-[26ch] text-pretty">
              Habits stick when someone&apos;s watching. Set a challenge, name
              a stake, send one link.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-4">
              <h2 className="text-ink-subtle text-xs font-medium tracking-[0.08em] uppercase">
                {col.title}
              </h2>
              <ul className="flex flex-col gap-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink-muted hover:text-ink-foreground inline-flex items-center gap-1 rounded-sm transition-colors"
                      >
                        {l.label}
                        <ArrowUpRight className="size-3.5" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-ink-muted hover:text-ink-foreground rounded-sm transition-colors"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-ink-line text-ink-subtle mt-16 flex flex-col gap-2 border-t py-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getUTCFullYear()} Habitual. Free to use.</p>
          <p>Built with Next.js and Supabase.</p>
        </div>
      </div>

      {/* The signature: the name at display size, faint, cropped by the
          bottom edge. Decorative; the logo above carries the name. */}
      <p
        aria-hidden
        className="pointer-events-none -mb-[0.22em] text-center text-[clamp(5rem,21vw,19rem)] leading-[0.8] tracking-[-0.06em] text-white/[0.06] select-none"
      >
        Habitual
      </p>
    </footer>
  );
}
