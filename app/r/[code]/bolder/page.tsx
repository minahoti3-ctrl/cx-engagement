"use client";

import { useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { NotesSection, type Note } from "@/app/components/NotesSection";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { useReactions } from "@/hooks/useReactions";
import {
  useReadinessSignals,
  type SignalKey,
  type SignalRating,
} from "@/hooks/useReadinessSignals";
import { COLORS, RAG, colorForIdx } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

type BolderTrigger = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

type BolderNote = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

const RAG_ORDER = ["green", "amber", "red"] as const;
type Rag = (typeof RAG_ORDER)[number];

const SIGNALS: ReadonlyArray<{ id: SignalKey; label: string }> = [
  { id: "s1", label: "We are moving in the right direction" },
  {
    id: "s2",
    label:
      "We know what signals indicate readiness to move from bold to bolder",
  },
  {
    id: "s3",
    label:
      "We're aware of and actively working towards cutting-edge innovation in the industry",
  },
];

const STAGES: ReadonlyArray<{
  label: string;
  sub: string;
  color: string;
  bg: string;
  dashed?: boolean;
}> = [
  { label: "BOLD",    sub: "Where we are",             color: RAG.green.hex, bg: RAG.green.tint },
  { label: "BOLDER",  sub: "What we're testing for",  color: RAG.amber.hex, bg: RAG.amber.tint },
  { label: "BOLDEST", sub: "The horizon",              color: "#888",        bg: "transparent", dashed: true },
];

export default function BolderPage() {
  const { session, currentParticipant, participants } = useSession();
  const { items: triggers } = useEntries<BolderTrigger>(
    "bolder_triggers",
    session?.id ?? null,
  );
  const { items: bolderNotes } = useEntries<BolderNote>(
    "bolder_notes",
    session?.id ?? null,
  );
  const { signals, setSignal } = useReadinessSignals(session?.id ?? null);
  const { reactions } = useReactions(session?.id ?? null);

  const [triggerDraft, setTriggerDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

  // --- trigger submit ---
  const submitTrigger = async () => {
    const text = triggerDraft.trim();
    if (!text || !session || !currentParticipant || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("bolder_triggers").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("[bolder_triggers insert]", error);
    else setTriggerDraft("");
    setSubmitting(false);
  };

  // --- per-participant RAG on a trigger ---
  //
  // The partial unique index `reactions_one_rag_per_trigger` enforces that
  // a participant can have at most one of {green, amber, red} per entry,
  // so to switch colors we DELETE the old row first, then INSERT the new.
  // Same color again = pure DELETE (toggle off).
  const rateTrigger = async (triggerId: string, kind: Rag) => {
    if (!session || !currentParticipant) return;
    const sb = getSupabase();
    const participantId = currentParticipant.id;
    const triggerReactions = reactions.get(triggerId);

    // Find this user's current RAG on this trigger, if any.
    let currentRag: Rag | null = null;
    for (const k of RAG_ORDER) {
      const ids = triggerReactions?.[k];
      if (Array.isArray(ids) && ids.includes(participantId)) {
        currentRag = k;
        break;
      }
    }

    // Toggle off — delete existing row, no insert.
    if (currentRag === kind) {
      const { error } = await sb
        .from("reactions")
        .delete()
        .eq("entry_type", "bolder_trigger")
        .eq("entry_id", triggerId)
        .eq("participant_id", participantId)
        .eq("kind", kind);
      if (error) console.error("[rateTrigger:delete-same]", error);
      return;
    }

    // Switching colors — delete the old RAG row first so the partial unique
    // index doesn't reject the insert.
    if (currentRag) {
      const { error: delErr } = await sb
        .from("reactions")
        .delete()
        .eq("entry_type", "bolder_trigger")
        .eq("entry_id", triggerId)
        .eq("participant_id", participantId)
        .eq("kind", currentRag);
      if (delErr) {
        console.error("[rateTrigger:delete-old]", delErr);
        return;
      }
    }

    const { error: insErr } = await sb.from("reactions").insert({
      session_id: session.id,
      entry_type: "bolder_trigger",
      entry_id: triggerId,
      participant_id: participantId,
      kind,
    });
    // 23505 = race lost (someone else flipped the row state); swallow.
    if (insErr && (insErr as { code?: string }).code !== "23505") {
      console.error("[rateTrigger:insert]", insErr);
    }
  };

  // --- notes ---
  const submitBolderNote = async (text: string) => {
    if (!session || !currentParticipant) return;
    const sb = getSupabase();
    const { error } = await sb.from("bolder_notes").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("[bolder_notes insert]", error);
  };

  const notesForSection: Note[] = bolderNotes.map((n) => {
    const p = participantById(n.participant_id);
    return {
      id: n.id,
      text: n.text,
      participant_name: p?.name ?? "Unknown",
      participant_color_idx: p?.color_idx ?? 0,
    };
  });

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        <Eyebrow color={COLORS[2].hex}>LOOKING AHEAD · 3 OF 3</Eyebrow>
        <h1 className="text-[38px] font-medium leading-[1.1] text-navy mb-0.5">
          From bold to bolder
        </h1>
        <p className="text-xs text-ink-ghost mb-7">~ 20 min</p>

        <Card accent={COLORS[3].hex} className="mb-6">
          <Eyebrow color={COLORS[3].hex}>THE QUESTION</Eyebrow>
          <h2 className="text-2xl font-medium text-navy leading-tight">
            How do we keep an eye on the future while we&apos;re executing
            Bold today?
          </h2>
        </Card>

        <div className="rounded-2xl p-5 mb-6" style={{ background: "#FAFAF7" }}>
          <div className="text-[10px] font-medium tracking-[1px] text-ink-faint mb-3">
            IF THE ROOM GETS QUIET, PULL ON ONE OF THESE
          </div>
          <ul className="list-none text-[13px] text-ink-soft leading-[1.8]">
            <li>
              • Are we aligned on our direction of travel? What does success
              look like for this program in 18 months?
            </li>
            <li>• How do we avoid being stuck in foundational work forever?</li>
            <li>
              • What signals or triggers indicate readiness to move to Bolder?
              Are there workstreams already operating at Bolder?
            </li>
            <li>
              • What else is happening in the industry that we should be
              focusing on?
            </li>
            <li>• What role should the VMO play?</li>
          </ul>
        </div>

        {/* BOLD / BOLDER / BOLDEST band */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
          {STAGES.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl text-center p-5"
              style={{
                background: s.bg,
                border: s.dashed ? "1.5px dashed #ccc" : undefined,
              }}
            >
              <div
                className="text-[13px] font-medium"
                style={{ letterSpacing: 1, color: s.color }}
              >
                {s.label}
              </div>
              <div
                className="text-[11px] mt-1"
                style={{ color: s.color, opacity: 0.8 }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Readiness signals — ROOM-WIDE last-write-wins */}
        <Eyebrow color={COLORS[0].hex}>ASSESS OUR CURRENT STATE</Eyebrow>
        <p className="text-xs text-ink-faint mb-4">
          Where are we, honestly? The pattern of reds and greens <em>is</em>{" "}
          the answer.
        </p>

        <div className="mb-7">
          {SIGNALS.map((s) => {
            const current = signals.get(s.id) ?? null;
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border-[0.5px] border-black/[0.06] flex items-center gap-3 mb-2"
                style={{ padding: "12px 14px" }}
              >
                <div className="flex-1">
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: COLORS[1].hex }}
                  >
                    {s.label}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {RAG_ORDER.map((c) => {
                    const active = current === c;
                    const cfg = RAG[c];
                    const disabled = !currentParticipant;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Set ${s.label} to ${c}`}
                        title={
                          c === "green"
                            ? "strong signal"
                            : c === "amber"
                            ? "partial signal"
                            : "not yet"
                        }
                        disabled={disabled}
                        onClick={() => setSignal(s.id, c as SignalRating)}
                        className="rounded-full transition disabled:cursor-not-allowed"
                        style={{
                          width: 28,
                          height: 28,
                          background: active ? cfg.hex : cfg.tint,
                          border: active ? `2px solid ${cfg.hex}` : "none",
                          opacity: !current || active ? 1 : 0.3,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Open question — trigger submissions */}
        <Card className="mb-6">
          <Eyebrow color={COLORS[4].hex}>OPEN QUESTION</Eyebrow>
          <h3 className="text-lg font-medium text-navy mb-1.5">
            What signals or triggers indicate readiness to move to Bolder?
          </h3>
          <p className="text-xs text-ink-faint mb-4">
            Drop in ideas. Tap red, amber, or green to indicate confidence —
            your tap shows in your color.
          </p>

          <div className="mb-4">
            {triggers.length === 0 ? (
              <div className="text-[13px] italic text-ink-ghost p-3">
                No triggers yet — drop the first one in.
              </div>
            ) : (
              triggers.map((t) => {
                const author = participantById(t.participant_id);
                const c = colorForIdx(author?.color_idx ?? 0);
                return (
                  <div
                    key={t.id}
                    className="flex gap-3 p-3 rounded-xl mb-2"
                    style={{ background: c.tint }}
                  >
                    <ParticipantBadge
                      name={author?.name ?? "?"}
                      colorIdx={author?.color_idx ?? 0}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[11px] font-medium mb-0.5"
                        style={{ color: c.dark }}
                      >
                        {author?.name ?? "Unknown"}
                      </div>
                      <div
                        className="text-sm mb-2"
                        style={{ color: c.dark }}
                      >
                        {t.text}
                      </div>
                      <TriggerRagBar
                        triggerId={t.id}
                        reactionsForEntry={reactions.get(t.id) ?? null}
                        currentParticipantId={currentParticipant?.id ?? null}
                        participantsById={participantById}
                        onRate={rateTrigger}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {currentParticipant ? (
            <div className="flex gap-2">
              <input
                value={triggerDraft}
                onChange={(e) => setTriggerDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitTrigger();
                }}
                placeholder="What signal or trigger comes to mind?"
                className="flex-1 px-4 py-2.5 rounded-full border border-black/10 bg-white text-sm outline-none focus:border-navy"
              />
              <PillButton
                onClick={submitTrigger}
                disabled={!triggerDraft.trim() || submitting}
              >
                Submit
              </PillButton>
            </div>
          ) : (
            <div className="text-xs text-ink-faint">
              Join from the welcome page to share.
            </div>
          )}
        </Card>

        <NotesSection
          notes={notesForSection}
          currentParticipantColorIdx={currentParticipant?.color_idx ?? null}
          onSubmit={submitBolderNote}
          placeholder="Two flips that move us to Bolder, or notes from the conversation..."
        />
      </div>
    </main>
  );
}

// ============================================================
// TriggerRagBar — per-participant RAG buttons + counts + tooltip
// of names. Selected state matches Celebrate's reaction "reacted"
// look (rgba(15,27,92,0.08) + rgba(15,27,92,0.2) border).
// ============================================================

function TriggerRagBar({
  triggerId,
  reactionsForEntry,
  currentParticipantId,
  participantsById,
  onRate,
}: {
  triggerId: string;
  reactionsForEntry: Partial<Record<Rag | "heart" | "like" | "q", string[]>> | null;
  currentParticipantId: string | null;
  participantsById: (id: string) => { id: string; name: string; color_idx: number } | null;
  onRate: (triggerId: string, kind: Rag) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {RAG_ORDER.map((k) => {
        const ids = (reactionsForEntry?.[k] ?? []) as string[];
        const count = ids.length;
        const reacted =
          currentParticipantId != null && ids.includes(currentParticipantId);
        const names = ids
          .map((id) => participantsById(id)?.name)
          .filter((n): n is string => Boolean(n))
          .join(", ");
        const cfg = RAG[k];
        return (
          <button
            key={k}
            type="button"
            disabled={!currentParticipantId}
            onClick={() => onRate(triggerId, k)}
            title={
              names ||
              (k === "green"
                ? "strong signal"
                : k === "amber"
                ? "partial signal"
                : "not yet")
            }
            className="inline-flex items-center gap-1.5 rounded-full border transition-transform duration-100 hover:enabled:scale-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              padding: "4px 10px",
              background: reacted ? "rgba(15,27,92,0.08)" : "white",
              borderColor: reacted
                ? "rgba(15,27,92,0.2)"
                : "rgba(0,0,0,0.08)",
            }}
          >
            <span
              className="rounded-full"
              style={{ width: 10, height: 10, background: cfg.hex }}
            />
            {count > 0 ? (
              <span
                className="text-[11px] font-medium"
                style={{ color: cfg.hex }}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
