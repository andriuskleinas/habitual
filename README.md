# Habitual App

A mobile-first web app where you set a challenge, put a stake on the line, and invite a buddy by link to watch, react, and hold you accountable — gamified to feel fun and addictive.

See [PLAN.md](./PLAN.md) for the product plan, data model, and the original build waves. [AGENTS.md](./AGENTS.md) has the conventions and gotchas worth knowing before you change anything.

## Stack

- **Next.js 15** (App Router) — server actions are the backend; the only route handler is the auth callback
- **React 19 · Tailwind CSS v4 · shadcn/ui on `radix-ui` · lucide-react**
- **Supabase** — Postgres, Auth (magic link *and* password), Row Level Security
- **Vercel** hosting — `main` auto-deploys

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **A fresh clone does not reproduce the database.** Migrations have been applied
> directly to the hosted Supabase project and are not tracked here — there is no
> `supabase/migrations/` directory. You need access to the existing project (or to
> rebuild the schema from [PLAN.md §5](./PLAN.md) and the RLS notes in AGENTS.md).

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | Canonical base URL — `metadataBase`, OG tags, `robots.txt`, `sitemap.xml`, the server-rendered invite link, and the email-change redirect. It does **not** drive magic-link sign-in, which resolves the origin from the request. Build-time inlined, so changing it needs a redeploy. |

## What's built

The core spine (waves 0–5) is complete and deployed; everything since has been
user-requested work outside the plan.

**Waves 0–5 — shipped**

- **0 · Foundations** — Next.js + Tailwind + shadcn, mobile shell, brand theme, Supabase wired, deployed.
- **1 · Data layer & auth** — 5 tables with RLS (cross-table visibility via `SECURITY DEFINER` helpers), magic-link sign-in, protected `/dashboard`.
- **2 · Owner loop** — create a challenge, log check-ins, streaks and progress.
- **3 · Sharing & buddy view** — invite token per challenge, public no-auth `/i/[token]` view, QR + Web Share + copy link.
- **4 · Growth loop** — invite claim on sign-in, buddy reactions (cheer / nudge / note), "I'm a buddy on" list.
- **5 · Gamification polish** — confetti on check-in, streak hero, landing page.

**Beyond the plan**

- **UI/UX overhaul** — responsive shell (the whole app used to be a 448px strip on desktop), dark mode, landing redesign, error/loading/not-found routes, OG images, robots + sitemap, accessibility fixes.
- **Password auth** — alongside magic link, plus a buddy → account conversion ladder, `/signup`, `/forgot-password`, `/account/password`.
- **Real cadences & rules** — daily / weekdays / weekly / fortnightly / monthly, a skip budget and a back-to-back miss limit, and three goal modes (tick, per-check-in target, cumulative total). Scoring moved from calendar days to *periods*; status is derived on read, never stored.
- **Profile & account page** — first/last name and nickname, theme picker, email change; the header reduced to wordmark + avatar.
- **One check-in a day** — enforced by a unique constraint rather than an upsert, with a receipt card in place of an edit form.
- **Dashboard redesign** — a "what needs you now" panel with a completion ring and a single next-action CTA, consistency % and a 14-day activity strip in place of vanity totals, challenges sorted into needs-you / all-set / finished, and cards that show the stake, buddy status, cheer count, and a one-tap check-in.

**Not built** — PLAN.md Wave 6 (stake as a first-class object with paid/forgiven, buddy-granted trophy, public challenge listing) and Wave 7 (nudge emails, groups, leaderboards, points).
