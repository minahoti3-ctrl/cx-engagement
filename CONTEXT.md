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
- [x] Step 2 — Schema applied in Supabase. SQL lives at `supabase/schema.sql`. 16 tables, RLS on, 15 in realtime publication.
- [x] Step 3 — Design tokens + 9 base components (DONE). `npm run build` passes.
- [x] Step 4 — Join flow + SessionProvider + realtime participant list. Awaiting 2-window verification on Vercel.

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

Phase 1 is complete pending a 2-window test on Vercel:
- `/` is the join screen (room code + name → join or create).
- `/r/[code]` is the in-room landing — shows the room code header, the current user's badge, and a live participant list. Inline name-entry form if visiting without an identity.
- Identity persistence: `localStorage["cx:participant:<CODE>"]` (ambiguity g).
- Realtime: one channel per session subscribes to `participants` with a `session_id=eq.<id>` filter. INSERT/UPDATE/DELETE all merge into local state by id.

**Next up:** Phase 2. Full scope (all 8 pages, full fidelity). Batched in this order, each batch paused for 2-window verification before continuing:

1. **Pages 0 + 1** — Welcome + Celebrate (lighter pages)
2. **Page 2** — Health check + Retro (complex, deserves its own batch)
3. **Pages 3 + 4** — Commitments + BAU
4. **Pages 5 + 6** — Org evolution + Bold to bolder
5. **Page 7 + stress test** — Close + 6-browser sync test

Top nav (8 tabs) and footer prev/next ship with batch 1.

### Data-layer map (`lib/`)

- `supabase.ts` — lazy browser singleton client. `getSupabase()`.
- `identity.ts` — `getStoredParticipantId(code)` / `storeParticipantId(code, id)` / `clearStoredParticipantId(code)`.
- `rooms.ts` — `normalizeCode`, `isValidCode`, `findSessionByCode`, `fetchParticipants`, `createParticipant`, `joinOrCreateRoom`, `joinExistingRoom`. Color assignment = `participants.length % 5` at join time; collisions tolerated (ambiguity i: with 6–10 people and 5 colors, repeats are expected — name + initials disambiguate).
- `colors.ts` — `COLORS` palette (5 entries, DB color_idx maps here), `colorForIdx`, `RAG`, `initials`.

### Provider

`app/components/SessionProvider.tsx` wraps `/r/[code]` and exposes `useSession()` returning `{ status, session, participants, currentParticipant, setCurrentParticipant }`. Status is `"loading" | "not-found" | "loaded"`.

### Design system map (`app/components/`)

| Component | Purpose | Notes |
|---|---|---|
| `Card` | Standard white panel with rounded-2xl + hairline border | `accent` prop adds the colored left rail used on BAU/Org/Bolder "question" cards |
| `Eyebrow` | All-caps colored label above headings | Default color = navy |
| `PillButton` | Primary / secondary / ghost button | Accepts `color` override for hero bands |
| `ParticipantBadge` | Initials disc in the participant's color | `size: 'sm' \| 'lg'` |
| `ReactionBar` | Heart / like / question reaction strip | Pure presentational — parent owns toggle + data |
| `ShapesBg` | Decorative circles/squares/triangles | `density: 'sparse' \| 'full'` |
| `Banner` | Big rounded hero band (Celebrate, Close) | `background` + `textColor` overrides |
| `NotesSection` | "NOTES & DECISIONS · LIVE" card used on pages 4/5/6 | Owns its own draft state, takes `onSubmit(text)` |
| `Modal` | Backdrop-dismiss modal w/ Esc + scroll lock | Used by Celebrate's story tiles |

Single source of truth for the 5-color participant palette: `lib/colors.ts` (`COLORS`, indices 0..4 — DO NOT reorder, the DB stores `color_idx` against this order). Tailwind tokens for static colors live in `app/globals.css` under `@theme` (e.g. `bg-navy`, `text-ink-mute`, `bg-rag-green-tint`).

**Not built yet — intentional:** top Nav, footer prev/next, drag-drop helpers, the health slider visualization, the 5-month timeline. These are page-specific and will live inline in Phase 2 (or be extracted later if they actually repeat).

### Schema cheat-sheet (what's in the DB)

- `sessions(id, code unique, created_by_participant_id)` — one row per workshop room. Join by `code`.
- `participants(id, session_id, name, color_idx 0..4)` — color stored as palette index, hex resolved client-side from `COLORS`.
- `proud_moments`, `success_defs`, `commitments(what, by_when)`, `bau_notes`, `org_notes`, `bolder_notes`, `final_reflections` — straightforward (session_id, participant_id, text).
- `health_submissions` PK `(session_id, participant_id)` — engagement/energy/prioritisation/ways nullable until submit; pin_x/pin_y independent (ambiguity c).
- `retro_cards(lane in cx|vmo, action in continue|stop|change, text)` — reference's `cxCont` etc. is split into two columns.
- `bau_criteria(session_id PK, criteria jsonb)` — single blob `{ must, nice, risk, tray }`, last-write-wins (ambiguity d). App seeds defaults on first read.
- `org_pins(text, month in jul|aug|sep|oct|nov | null)` — nullable month = unassigned tray.
- `readiness_signals(session_id, participant_id, signal_key in s1|s2|s3, rating in green|amber|red)` — per-participant for the 3 fixed signals only (ambiguity e).
- `bolder_triggers(text)` — RAG ratings for these go in `reactions`.
- `reactions(entry_type, entry_id, participant_id, kind)` — kinds `heart|like|q|green|amber|red`. UNIQUE per (entry,participant,kind). A partial unique index enforces one-of-RAG per participant per trigger entry.

RLS is ON with permissive anon policies on every table. All UI-driving tables are in the `supabase_realtime` publication.

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
