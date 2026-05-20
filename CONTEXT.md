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
- [x] Page 0 — Welcome (agenda, goal, participant list, "Start the session →")
- [x] Page 1 — Celebrate (banner, 3 story modals, proud_moments + reactions, 4 stat modals, success_defs + reactions)
- [x] Page 2 — Health Check + Retro (4 dials with live team-avg + dots, click-to-drop direction pin, 2×3 retro board with per-card reactions)
- [x] Page 3 — Commitments (LIVE synthesis card pulling from Page 2 data, commitment wall with author-edit, reactions)
- [x] Page 4 — BAU (drag-drop criteria across must/nice/risk + tray, last-write-wins jsonb, notes)
- [ ] Page 5 — Org Evolution (5-month timeline with drag-drop pins + notes)
- [ ] Page 6 — Bold to Bolder (3 RAG signals + trigger submissions + notes)
- [ ] Page 7 — Close (no video)
- [ ] Stress test with 6 simultaneous browsers

## 5. Where we are right now

Phase 2 batch 2 shipped (Page 2 — Health check + Retro). Awaiting 2-window verification.

Health page architecture:
- `useHealthSubmissions(sessionId)` returns `{ submissions: Map<participant_id, HealthSubmission>, loaded }`. PK is `(session_id, participant_id)`, so participant_id is a safe key. Dials and pin live on the SAME row, both nullable independently (ambiguity c).
- Writes use `upsert` with the FULL row from local state — the same user is the only writer for their own row, so reading other fields from state is safe.
  - submitDials() = upsert with dials filled + submitted_at = now
  - unsubmitDials() = upsert with dials NULL + submitted_at NULL (preserves pin)
  - dropPin(x, y) = upsert with pin_x/pin_y set (preserves dials)
- Draft state for dials is component-local (initRef pattern initializes once from the user's existing submission, then the draft is owned by the component so Edit preserves the last answer).
- Direction pin scatter uses `pointer-events: none` on the pin discs so clicks always land on the scatter background (lets you click-to-move a pin even when clicking near another participant's pin).
- Retro grid uses `gridTemplateColumns: "120px 1fr 1fr 1fr"` with a header row + 2 lane rows. Each cell is a `RetroCell` with its own draft state (Enter submits, input clears on success). Card reactions reuse the shared `useReactions` hook with `entry_type: "retro_card"`.

### Routing map

- `/r/[code]` — Welcome (page 0)
- `/r/[code]/celebrate` — Celebrate (page 1)
- `/r/[code]/health` — Health check + Retro (page 2)
- `/r/[code]/commitments` — Commitments (page 3)
- `/r/[code]/bau` — BAU / Transition (page 4)
- `/r/[code]/{org,bolder,close}` — placeholders

### Page 3 synthesis card

The "✨ Session synthesis" card on Commitments pulls live data from page 2 via three existing hooks (`useHealthSubmissions`, `useEntries<RetroCard>("retro_cards", ...)`, `useReactions`). Recomputes via `useMemo` whenever any of those change. Three sub-blocks:

1. **PROGRAM HEALTH AT A GLANCE** — 4 dial averages + lowest/highest call-out + spread interpretation ("tight consensus" if worst spread ≤ 22 across all dials, "mixed views" otherwise). Pre-submit fallback: "No health data yet — the synthesis will populate as the room submits on page 2."
2. **WHERE THE ROOM PLACED THE PROGRAM** — pin quadrant tallies. Quadrants: top-right = "sweet spot (on course, fast)", top-left = "off course, fast", bottom-right = "on course, too slow", bottom-left = "off course, too slow". First quadrant in the sentence carries the word "pin"/"pins" (pluralized); subsequent quadrants drop it. Pre-pin fallback: "No pins dropped yet."
3. **WHAT THE RETRO IS SAYING** — highest-reacted retro card (heart + like + q weighted equally; earliest created_at breaks ties). Renders the card text + only the reaction kinds with count > 0. Pre-reaction fallback: "No reactions on retro cards yet — the most-discussed card will surface here once the room weighs in."

### Page 4 BAU concurrency

One row per session in `bau_criteria` with a single jsonb `criteria` column holding `{must, nice, risk, tray}`. Every drag/drop/click-to-tray/×-delete/add writes the whole blob back. Last-write-wins (ambiguity d) — two simultaneous drags can clobber each other; for the workshop's 6–10 people this is acceptable. First Page-4 load for a new session seeds the row with the reference's default criteria; race-tolerant on the seed insert (23505 = lost race = we already have SEED locally + realtime echo will confirm).

### Hooks

- `useBauCriteria(sessionId)` — single-row hook returning `{ criteria, loaded, updateCriteria }`. Handles seed-on-first-load.

### Migration 002

`alter table public.commitments replica identity full;` + same for `bau_criteria`. Neither is strictly required (client keys state by PK on both), but cheap belt-and-braces. Already added to `schema.sql` so future re-runs include it; standalone file at `supabase/migrations/002_replica_identity_full_safety.sql`.

- `/r/[code]` is now the Welcome page (page 0): magenta badge, hero heading, goal banner, live participant list, agenda morning/afternoon, "Start the session →".
- `/r/[code]/celebrate` is page 1: 6-months banner, 3 story tiles with click-to-open detail modals, proud_moments submit + list with reaction bars (live), 4 stat tiles with detail modals (the 50+ "Jazzicians" name list lives in the involved-stat detail), navy "BIG QUESTION" card with success_defs submit + list with reaction bars (live).
- All 8 page routes exist (`/r/[code]`, `/r/[code]/celebrate`, then `/health`, `/commitments`, `/bau`, `/org`, `/bolder`, `/close`). Pages 2–7 are placeholders using `ComingSoon`.
- `PageNav` (sticky top, 8 tabs + room code + your badge + count) and `PageFooter` (← Back / Page X of 8 / Next →) wrap every room page.
- Realtime: pages subscribe to their entries via `useEntries` and to all reactions via `useReactions` (one channel for all reactions on a page, filtered client-side by entry_type).

**Reset button NOT YET IMPLEMENTED** — destructive across 15 tables, kicks everyone out. Needs its own confirmation UX before shipping. Visible space reserved for it in the nav right-hand area but no button rendered. Will surface again before Phase 2 wraps.

**Next up:** Phase 2 batch 4 — Pages 5 + 6 (Org evolution + Bold to bolder). Org evolution has the 5-month drag-drop timeline + pin submissions + notes. Bold to bolder has the 3 fixed RAG signals (per-participant) + trigger submissions with R/A/G ratings (reuses reactions with the green/amber/red kinds) + notes.

### Data hooks (`hooks/`)

- `useEntries<T>(table, sessionId, orderBy?)` — generic load + realtime subscription for any per-session table.
- `useReactions(sessionId)` — one subscription for all reactions in the session. Returns `{ reactions: ReactionMap, toggleReaction }`. `reactions.get(entryId)?.[kind]` gives the participant_id array. `toggleReaction(entryType, entryId, participantId, kind)` handles insert/delete + ignores 23505 unique-violation races.

### Routing map

- `/` — join screen
- `/r/[code]` — Welcome (page 0)
- `/r/[code]/celebrate` — Celebrate (page 1)
- `/r/[code]/{health,commitments,bau,org,bolder,close}` — placeholders

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
