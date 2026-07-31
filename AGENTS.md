# Habitual — agent rules

> This file previously carried a generated `nextjs-agent-rules` block warning that
> "this is NOT the Next.js you know" and pointing at `node_modules/next/dist/docs/`.
> That block came from a `create-next-app` run that pulled Next **16**; the project
> was then pinned to Next **15**, where no such directory ships. Following it sent
> agents looking for docs that don't exist. If you re-scaffold and the block comes
> back, check whether it's true before keeping it.

## Stack

Next.js **15.5.x** App Router · React 19 · Tailwind **v4** · shadcn/ui on the
`radix-ui` umbrella dep · Supabase (Postgres + Auth + RLS) · Vercel.

Next 15 is a deliberate pin, not an accident — **do not upgrade to 16 without
asking.** Standard Next 15 App Router conventions apply; there is nothing exotic
here and no bundled docs to consult.

## Conventions that will bite you

- **Server actions are the backend.** The only route handler is
  `src/app/auth/callback/route.ts`. Don't add API routes for things an action can do.
- **A `"use server"` file may only export async functions.** Exporting a const
  array from one crashes the route at build time; keep constants un-exported or
  move them to a plain module.
- **`.insert().select()` enforces the table's SELECT policy on the new row.** Any
  RLS SELECT policy must be satisfiable from the candidate row's own columns, or
  the `RETURNING` fails with 42501.
- **`public.users` is self-read only** (`users_select_own`). You cannot read another
  person's name, ever, via a normal query — that's what the `SECURITY DEFINER` RPCs
  (`reactions_for_challenge`, `challenge_by_invite`) exist for. Don't join `users`
  hoping to show a buddy's name.
- **Migrations are applied to the remote Supabase project via MCP and are not
  tracked in this repo** (there is no `supabase/migrations/`). A fresh clone
  reproduces no schema. Confirm `get_project_url` returns the Habitual project
  before any schema work.
- **`src/lib/challenges.ts` is the single source of truth for challenge scoring.**
  `evaluateChallenge()` works in *periods* (one slot to fill), not calendar days.
  Status is derived on every read, never persisted.
- **Dates are UTC calendar days** (`YYYY-MM-DD`). Always go through `todayISO()` /
  `addDays()` so what gets written and what gets compared agree.
- Dark mode is class-based, resolved pre-paint by `ThemeScript`. The variant is
  `&:where(.dark, .dark *)` so it also matches `<html>` itself. **It is an
  account feature**: the only control is the picker on `/account`, and with
  nothing stored `ThemeScript` follows the OS *only if a session cookie is
  present*, so anonymous visitors always get light. Don't add a theme toggle to
  a public page.
- **Three brand colours, each with one job** (defined in `globals.css`):
  indigo `--primary` for structure, navigation and CTAs; green `--success` for
  check-ins, streaks and progress; amber `--warning` (aliased `--cheer` where a
  cheer, not a warning, is meant) for stakes, nudges and milestones. A progress
  bar is never indigo and a button is never green.
- **`--success` / `--warning` fill shapes; `--success-ink` / `--warning-ink` set
  type.** The brand green and amber clear 3:1 (icons, bars, large text) but not
  the 4.5:1 body copy needs. `text-success` on a page background fails contrast —
  use `text-success-ink`. Same for amber, where the gap is much worse.

## Working here

- `npm run dev` via the preview tooling — never a bare shell. After any
  `npm install`, clear `.next` and restart, or the client bundle silently breaks
  while `npm run build` stays green.
- Don't run `npm run build` against a live dev server; they share `.next`.
- Verify with `npx tsc --noEmit` and `npx eslint` before calling anything done.
