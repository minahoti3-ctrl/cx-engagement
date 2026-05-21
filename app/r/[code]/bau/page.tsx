"use client";

import { useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { NotesSection, type Note } from "@/app/components/NotesSection";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PillButton } from "@/app/components/PillButton";
import { ReactionBar } from "@/app/components/ReactionBar";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { useReactions, type ReactionKind } from "@/hooks/useReactions";
import { COLORS, colorForIdx, type ParticipantColor } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

type BauNote = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

type BauOptionComment = {
  id: string;
  session_id: string;
  participant_id: string;
  option_id: string;
  text: string;
  created_at: string;
};

type Participant = { id: string; name: string; color_idx: number };

// Hardcoded BAU future-state options. The UUIDs are stable so the
// reactions table (entry_id is uuid) can key on them; the text
// `optionId` is used for bau_option_comments.option_id.
const BAU_OPTIONS: ReadonlyArray<{
  num: number;
  optionId: string;
  entryId: string;
  text: string;
  color: ParticipantColor;
}> = [
  {
    num: 1,
    optionId: "bau-option-1",
    entryId: "ba00ba00-0000-4000-8000-000000000001",
    text: "We continue as we are, workstream leads remain",
    color: COLORS[0], // magenta
  },
  {
    num: 2,
    optionId: "bau-option-2",
    entryId: "ba00ba00-0000-4000-8000-000000000002",
    text: "Enablement workstreams close by December, embed enablement into ways of working and push for bolder",
    color: COLORS[2], // cobalt
  },
  {
    num: 3,
    optionId: "bau-option-3",
    entryId: "ba00ba00-0000-4000-8000-000000000003",
    text: "CXT ramps down and a smaller team remains to push bolder",
    color: COLORS[3], // amber
  },
  {
    num: 4,
    optionId: "bau-option-4",
    entryId: "ba00ba00-0000-4000-8000-000000000004",
    text: "Dissolve CXT completely and CXO owns bolder",
    color: COLORS[4], // lavender
  },
  {
    num: 5,
    optionId: "bau-option-5",
    entryId: "ba00ba00-0000-4000-8000-000000000005",
    text: "Go bigger: Expand CXT to enterprise level under the chief transformation officer",
    color: COLORS[1], // navy
  },
];

export default function BauPage() {
  const { session, currentParticipant, participants } = useSession();
  const { items: bauNotes } = useEntries<BauNote>("bau_notes", session?.id ?? null);
  const { items: comments } = useEntries<BauOptionComment>(
    "bau_option_comments",
    session?.id ?? null,
  );
  const { reactions, toggleReaction } = useReactions(session?.id ?? null);

  const participantById = (id: string): Participant | null =>
    participants.find((p) => p.id === id) ?? null;

  const submitBauNote = async (text: string) => {
    if (!session || !currentParticipant) return;
    const sb = getSupabase();
    const { error } = await sb.from("bau_notes").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("[bau_notes insert]", error);
  };

  const notesForSection: Note[] = bauNotes.map((n) => {
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
        <Eyebrow color={COLORS[2].hex}>LOOKING AHEAD · 1 OF 3</Eyebrow>
        <h1 className="text-[38px] font-medium leading-[1.1] text-navy mb-0.5">
          Transition to BAU
        </h1>
        <p className="text-xs text-ink-ghost mb-7">~ 40 min</p>

        <Card accent={COLORS[4].hex} className="mb-6">
          <Eyebrow color={COLORS[4].hex}>THE QUESTION FOR THE ROOM</Eyebrow>
          <h2 className="text-2xl font-medium text-navy leading-tight">
            What is the role of CXT when a new organization (e.g., CXO) goes
            live?
          </h2>
        </Card>

        <div
          className="rounded-2xl p-5 mb-7"
          style={{ background: "#FAFAF7" }}
        >
          <div className="text-[10px] font-medium tracking-[1px] text-ink-faint mb-3">
            IF THE ROOM GETS QUIET, PULL ON ONE OF THESE
          </div>
          <ul className="list-none text-[13px] text-ink-soft leading-[1.8]">
            <li>• What needs to be true for a workstream to go to BAU?</li>
            <li>• How does governance change — and how does it interact with CXT?</li>
            <li>
              • What do we risk by transitioning <em>too early</em>? Too late?
            </li>
          </ul>
          <div className="mt-3 pt-3 border-t border-black/[0.05] text-xs text-ink-mute">
            ⚓ Anchor in <strong>Global Capabilities → CXO</strong> as the
            worked example.
          </div>
        </div>

        <Eyebrow color={COLORS[2].hex}>POSSIBLE FUTURE STATES</Eyebrow>
        <h3 className="text-lg font-medium text-navy mb-1.5">
          Which direction makes sense?
        </h3>
        <p className="text-xs text-ink-faint mb-4">
          React to the options below. Drop a comment with your perspective or
          questions.
        </p>

        <div className="flex flex-col gap-3 mb-7">
          {BAU_OPTIONS.map((opt) => {
            const optComments = comments.filter(
              (c) => c.option_id === opt.optionId,
            );
            return (
              <BauOptionTile
                key={opt.optionId}
                option={opt}
                comments={optComments}
                participantById={participantById}
                reactions={reactions.get(opt.entryId) ?? null}
                onToggle={(k: ReactionKind) =>
                  toggleReaction(
                    "bau_option",
                    opt.entryId,
                    currentParticipant?.id ?? null,
                    k,
                  )
                }
                currentParticipantId={currentParticipant?.id ?? null}
                sessionId={session?.id ?? null}
              />
            );
          })}
        </div>

        <NotesSection
          notes={notesForSection}
          currentParticipantColorIdx={currentParticipant?.color_idx ?? null}
          onSubmit={submitBauNote}
          placeholder="What did the room land on? Decisions, tensions, follow-ups..."
        />
      </div>
    </main>
  );
}

// ============================================================
// BauOptionTile — read-only option card with reactions + comments.
// Comments are append-only (no edit, no delete) — same lock as
// proud moments on Celebrate.
// ============================================================

function BauOptionTile({
  option,
  comments,
  participantById,
  reactions,
  onToggle,
  currentParticipantId,
  sessionId,
}: {
  option: {
    num: number;
    optionId: string;
    entryId: string;
    text: string;
    color: ParticipantColor;
  };
  comments: BauOptionComment[];
  participantById: (id: string) => Participant | null;
  reactions: Partial<Record<ReactionKind, string[]>> | null;
  onToggle: (kind: ReactionKind) => void;
  currentParticipantId: string | null;
  sessionId: string | null;
}) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitComment = async () => {
    const text = draft.trim();
    if (!text || !sessionId || !currentParticipantId || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("bau_option_comments").insert({
      session_id: sessionId,
      participant_id: currentParticipantId,
      option_id: option.optionId,
      text,
    });
    if (error) console.error("[bau_option_comments insert]", error);
    else setDraft("");
    setSubmitting(false);
  };

  return (
    <div
      className="rounded-2xl p-4 flex gap-3"
      style={{ background: option.color.tint, color: option.color.dark }}
    >
      <div
        className="rounded-full flex items-center justify-center text-white font-medium text-[13px] shrink-0"
        style={{ background: option.color.hex, width: 28, height: 28 }}
      >
        {option.num}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-medium leading-snug"
          style={{ color: option.color.dark }}
        >
          {option.text}
        </div>

        <ReactionBar
          reactions={reactions}
          currentParticipantId={currentParticipantId}
          onToggle={onToggle}
        />

        {comments.length > 0 ? (
          <div className="mt-3 flex flex-col gap-1.5">
            {comments.map((c) => {
              const author = participantById(c.participant_id);
              const ac = colorForIdx(author?.color_idx ?? 0);
              return (
                <div
                  key={c.id}
                  className="flex gap-2 p-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.55)" }}
                >
                  <ParticipantBadge
                    name={author?.name ?? "?"}
                    colorIdx={author?.color_idx ?? 0}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: ac.dark }}
                    >
                      {author?.name ?? "Unknown"}
                    </div>
                    <div
                      className="text-[13px] whitespace-pre-wrap break-words"
                      style={{ color: ac.dark }}
                    >
                      {c.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {currentParticipantId ? (
          <div className="flex gap-2 mt-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment();
              }}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1.5 rounded-full bg-white text-xs outline-none border border-black/[0.08] focus:border-navy"
            />
            <PillButton
              variant="secondary"
              onClick={submitComment}
              disabled={!draft.trim() || submitting}
            >
              Post
            </PillButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
