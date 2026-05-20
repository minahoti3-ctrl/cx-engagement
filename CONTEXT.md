# CX Engagement — Build Context

> Read this file at the start of every session before writing code.

## 1. Project summary

A multi-device, real-time web app for a one-day CX Transformation leadership session at the 6-month mark. 6–10 participants join a shared room from their own devices (laptops or phones); every interaction — submitting answers, dragging pins, reacting, voting — appears live on everyone else's screen via Supabase realtime. The visual design, copy, page structure, and interaction patterns are fixed in the reference HTML; we're rewriting the data layer (from local memory to Supabase) without changing the UI.

## 2. Tech stack

- Next.js 16 + React 19 (App Router, TypeScript)
- Tailwind CSS v4 (CSS-first `@theme` config, not `tailwind.config.js`)
- Supabase (`@supabase/supabase-js`) for database + realtime
- Framer Motion for animations
- Vercel hosting, GitHub source

## 3. Credentials & links

| Thing | Value |
|---|---|
| GitHub username | `minahoti3-ctrl` |
| GitHub repo | https://github.com/minahoti3-ctrl/cx-engagement |
| Vercel live URL | https://cx-engagement.vercel.app/ |
| Supabase project URL | https://sdjbfxwakuexwiiukklf.supabase.co |
| Supabase publishable key | `sb_publishable_u1F2MrHGQfAbD6t5gK9irA_COiiUw8s` |
| Local project folder | `C:\Users\Mina.Hoti\cx-engagement` |
| Reference HTML | `/reference/cx-engagement-app.html` |

Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set both in `.env.local` (gitignored) and in Vercel (Production / Preview / Development).

## 4. Build plan

### Phase 1 — Foundation
- [x] Step 1 — Scaffold Next.js, push to GitHub, deploy to Vercel (DONE)
- [ ] Step 2 — Write Supabase schema SQL and apply via Supabase SQL editor
- [ ] Step 3 — Build design system (Tailwind config, base components)
- [ ] Step 4 — Build join flow + SessionProvider + realtime participant list

### Phase 2 — Pages
- [ ] Page 0 — Welcome
- [ ] Page 1 — Celebrate
- [ ] Page 2 — Health Check + Retro
- [ ] Page 3 — Commitments (fake AI synthesis card)
- [ ] Page 4 — BAU (drag-drop criteria + notes)
- [ ] Page 5 — Org Evolution (5-month timeline with drag-drop pins + notes)
- [ ] Page 6 — Bold to Bolder (3 RAG signals + trigger submissions + notes)
- [ ] Page 7 — Close (no video)
- [ ] Stress test with 6 simultaneous browsers

## 5. Where we are right now

Phase 1 Step 1 fully done. The live URL shows the cream "Pipeline is live." placeholder confirming the GitHub → Vercel pipeline works end-to-end with env vars wired in.

**Next up:** Phase 1 Step 2 — Supabase schema. Claude Code cannot reach Supabase directly; the schema SQL will be generated here and Mina will paste it into the Supabase SQL editor at https://supabase.com/dashboard/project/sdjbfxwakuexwiiukklf/sql/new and run it.

## 6. Resolved ambiguities — DO NOT re-litigate

These were decided in the kickoff conversation. They are baked into the design.

| # | Topic | Decision |
|---|---|---|
| a | Page navigation | **Independent.** Drop `current_page` from the schema. Each user navigates freely. (A facilitator-nudge feature may be added later.) |
| b | User-switcher dropdown | **Remove.** Each device = one identity. The dropdown from the reference HTML does not exist in the multi-device version. |
| c | Direction pin on health page | **Independent of dial submission.** `pin_x` and `pin_y` are nullable on `health_submissions`. People can drop/move the scatter pin in any order, before or after submitting dials. |
| d | BAU drag-and-drop concurrency | **Last-write-wins** on a single `criteria` jsonb blob is fine for 6–10 people. No item-level rows. |
| e | Bolder trigger RAG ratings | Use the **`reactions` table** with kinds `green / amber / red` keyed by `entry_id` of the trigger entry. The `readiness_signals` table is reserved **only** for the 3 fixed top-of-page signals (`s1`, `s2`, `s3`). |
| f | Facilitator role | **No host flag** for Phase 1. Everyone equal. Reset button restricted to whoever created the room — track via `sessions.created_by_participant_id`. |
| g | Identity persistence | **Stash `participant_id` in `localStorage`** keyed by room code. Refresh keeps the user signed in with the same color. |

## 7. Resume instructions for tomorrow

```powershell
cd $HOME\cx-engagement
claude
```

Then paste this exact message:

> We're continuing the build. Read CONTEXT.md and the reference HTML at /reference/cx-engagement-app.html, check the current project state, and tell me what step we're up to and what's next. Don't write code until I approve.
