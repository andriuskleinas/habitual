# The Consistency App — Build Plan

> A mobile-friendly website where you set a daily challenge, invite a buddy by link, log your progress, and your buddy watches, reacts, and holds you to a stake — gamified to feel fun and addictive.

---

## 1. Product in One Line

A mobile-friendly website (not a native app) where a user sets a daily challenge, shares it with a buddy, commits to a stake, logs daily progress, and the buddy watches, reacts (cheer / nudge / reward / note), and holds them accountable — the whole experience gamified to feel fun and addictive.

## 2. Target User & Pain

- **User:** a busy person distracted by social media, news, and stress; chronically postpones good habits ("I'll start Monday", "New Year, new me").
- **Pain:** reduced attention span + distraction means daily good habits (reading, exercise, meditation) get postponed indefinitely.
- **Insight:** accountability works — going to the gym with a buddy beats going alone. A watching friend + real stakes increases follow-through.

---

## 3. The Golden Path (the one thread that must work end-to-end)

```
1. Sign in (magic link)
2. Create a challenge     -> title, cadence, daily target, duration
3. Set a stake            -> "lunch on me if I fail" (text)
4. Invite a buddy         -> shareable link (QR / email / social all wrap this ONE link)
5. Log daily progress     -> done / value + note -> streak + progress bar update
6. Buddy opens link       -> sees challenge LIVE, no account needed
7. Buddy reacts           -> prompted to sign in on first action -> cheer / nudge / note
8. Buddy becomes a user   -> invite auto-claimed -> can create their own challenges
```

Steps 1–7 are the demo. Step 8 is the growth loop (~30 min) — keep it in.

**Key simplification:** every sharing channel (email, QR, social, public) is the *same* shareable challenge link. Build the link first; QR / email / social are thin wrappers on it — do NOT build them as separate features.

---

## 4. The Buddy Model (LOCKED)

- **Watch = frictionless.** Invite link opens a live, read-only view with NO login.
- **Act = identified.** First cheer / nudge / reward triggers a one-tap magic-link sign-in.
- **Claim on sign-in.** First sign-in via the invite token fills `buddy_user_id` on the existing invite row -> the challenge is instantly attached to the buddy's new dashboard.
- **Symmetric peers.** ONE `users` table, no "buddy account type." Anyone with an account can own challenges AND be a buddy on others, simultaneously.
- **One source of truth.** A buddy is a relationship row pointing at the one challenge — never a copy.

### Dashboard once both are users
- **My Challenges:** `challenges WHERE owner_id = me`
- **I'm a buddy on:** `challenges JOIN buddies WHERE buddy_user_id = me`

Same challenge, two lenses (owner sees "log progress"; buddy sees "cheer / nudge / reward"). This is the viral loop: every invite is a signup funnel.

---

## 5. Data Model

```
users        id, email, name
challenges   id, owner_id->users, title, cadence, daily_target, start_date, end_date, is_public, stake_text
buddies      id, challenge_id->challenges, invite_token, buddy_user_id->users (nullable), status
check_ins    id, challenge_id->challenges, user_id->users, date, value, note      [unique: challenge_id + date]
reactions    id, challenge_id->challenges, check_in_id (nullable), from_user_id->users, type (cheer|nudge|reward|note), message
```

**RLS (Supabase Row Level Security = the authorization layer):**
- A challenge is readable if you're the owner, a claimed buddy, `is_public`, OR you hold a matching `invite_token`.
- Check-ins are writable by the owner only.
- Reactions require `auth.uid()` (identity guaranteed once signed in).

---

## 6. Tech Stack (LOCKED)

| Layer | Choice | Notes |
|---|---|---|
| Frontend + Backend | **Next.js 15 (App Router)** | Server actions = the backend. NO separate API server. |
| UI | **Tailwind CSS + shadcn/ui + lucide icons** | Pre-built accessible components = "killer UI" fast |
| Fun / gamification | **canvas-confetti** | Signature moment on successful check-in |
| Database + Auth | **Supabase** | Postgres, Auth (magic link), RLS, Storage, cron |
| Email | **Resend** | Invites + magic links (Supabase's built-in mailer is unreliable) |
| Sharing | **qrcode.react** + Web Share API | QR client-side; social via share-intent URLs — zero deps |
| Hosting | **Vercel** (app) + Supabase cloud (data) | Zero-config, HTTPS, free tier, env vars for secrets |
| Scheduling (Ring 3) | Supabase cron + Edge Function | Daily nudge email — only if ahead of schedule |

Deliberately boring, proven stack. No separate backend — Next.js server actions talk directly to Supabase.

---

## 7. Feature Rings (build outward, stop wherever time runs out)

**CORE SPINE** — golden-path steps 1–7, ugly but working end-to-end. One owner + one buddy through the whole loop.

**Ring 1 — makes it feel alive (highest ROI)**
- Streak counter + progress bar
- Confetti on successful check-in
- Buddy reactions (cheer / nudge)
- QR + social share buttons (wrappers on the link)
- Polish the TWO hero screens: landing page + challenge detail

**Ring 2 — depth & stakes**
- Stake as a first-class object (buddy marks paid / forgiven on failure)
- Buddy reward on success (trophy the buddy grants)
- Public challenge page (read-only, anyone can cheer)
- Invite-claim polish (step 8 fully wired)

**Ring 3 — roadmap (do NOT attempt in 1.5 days)**
- Daily nudge emails (Supabase cron)
- Multiple buddies / groups / leaderboards
- Points economy, levels, badges
- Real-time chat, forfeit / money-holding mechanics

### Gamification ROI (spend effort wisely)
Streaks + reactions + a visible stake deliver ~80% of the "addictive" feeling for ~20% of the effort. Skip points/badges/levels for the MVP.

---

## 8. Development Waves (build sequence)

Each wave is self-contained and ends with a **verifiable checkpoint**. Build a wave, verify it works, then move on. **Ideal: one wave per chat session** — start a fresh chat for each wave so context stays small and token usage stays low. Read this PLAN.md at the start of each new chat.

### Wave 0 — Foundations & pipeline (get deploy working FIRST)
- Init Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui.
- Connect Supabase project; set env vars locally and in Vercel.
- Base mobile-first layout shell + theme (accent color + font).
- Deploy the empty app to Vercel.
- **Checkpoint:** empty styled app loads on its live Vercel URL on a phone.

### Wave 1 — Data layer & auth
- Migration: create all 5 tables.
- Write & test RLS policies.
- Magic-link auth: sign in / sign out / session handling.
- Protected `/dashboard` route (redirects if not signed in).
- **Checkpoint:** can sign in via magic link, land on an empty dashboard, sign out.

### Wave 2 — Owner loop (create + log)
- Create-challenge form (title, cadence, daily target, duration, stake text).
- "My Challenges" list on dashboard.
- Challenge detail page (owner view).
- Log daily check-in -> streak + progress bar update.
- **Checkpoint:** create a challenge, log progress, see the streak grow.

### Wave 3 — Sharing & buddy view
- Generate invite link + token when a challenge is created.
- Token/public challenge view: read-only, NO auth required.
- QR code + Web Share / copy-link buttons.
- **Checkpoint:** open the invite link in an incognito window and see live progress with no login.

### Wave 4 — Buddy reactions & invite claim (the growth loop)
- On first buddy action -> magic-link sign-in -> claim invite (fill `buddy_user_id`).
- Reactions: cheer / nudge / note.
- "I'm a buddy on" section on the dashboard.
- **Checkpoint:** a second account signs in via the invite, cheers, and sees the challenge in their "buddy on" list.

### Wave 5 — Gamification polish & hero screens
- Confetti on successful check-in.
- Polish streak / progress visuals.
- Build the landing page (converts).
- Polish the challenge detail page (the daily-loop payoff screen).
- **Checkpoint:** landing + challenge detail look genuinely good on mobile; check-in feels rewarding.

### Wave 6 — Ring 2 (only if time remains)
- Stake as a first-class object (buddy marks paid / forgiven).
- Buddy reward on success (trophy).
- Public challenge page listing.

### Wave 7 — Ring 3 (roadmap / post-MVP)
- Daily nudge emails via Supabase cron, then everything else in Ring 3.

---

## 9. Discipline That Makes It Ship

1. Get the **entire thin spine (Waves 0–4)** working before touching ANY Ring 1 polish.
2. Spend the polish budget on **landing + challenge detail only**.
3. Any new idea -> write it in Ring 3, don't build it now.
4. **Pre-seed a demo owner + buddy account** so you never rely on live signup during a demo.
5. Write and test RLS immediately after the schema — never at the end.
6. One wave per chat; verify each checkpoint before moving on.

---

## 10. Verdict

**Doable in 1.5 days** for a focused single builder, provided scope stays on the golden path: async/link-based sharing (no real-time), streaks + reactions + stakes for the "addictive" feel, and analytics/notifications deferred to Ring 3. The MVP is small enough to validate the core hypothesis — *does a watching buddy + a stake increase follow-through?* — without over-building.
