# Habitual App

A mobile-first web app where you set a daily challenge, put a stake on the line, and invite a buddy by link to watch, react, and hold you accountable — gamified to feel fun and addictive.

See [PLAN.md](./PLAN.md) for the full product plan, data model, and build waves.

## Stack

- **Next.js 15** (App Router) — server actions are the backend, no separate API
- **Tailwind CSS v4 + shadcn/ui + lucide-react**
- **Supabase** — Postgres, Auth (magic link), Row Level Security
- **Vercel** hosting

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | Public base URL for invite links / magic-link redirects |

## Build progress

- **Wave 0 — Foundations** ✅ Next.js + Tailwind + shadcn, mobile shell, brand theme, Supabase wired, deployed.
- Wave 1 — Data layer & auth (next)
- Waves 2–7 — see [PLAN.md](./PLAN.md)
