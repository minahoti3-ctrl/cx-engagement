"use client";

import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { NotesSection, type Note } from "@/app/components/NotesSection";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { COLORS, RAG } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

type BolderNote = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

const STAGES: ReadonlyArray<{
  label: string;
  sub: string;
  color: string;
  bg: string;
  dashed?: boolean;
}> = [
  { label: "BOLD",    sub: "Where we are",            color: RAG.green.hex, bg: RAG.green.tint },
  { label: "BOLDER",  sub: "What we're testing for",  color: RAG.amber.hex, bg: RAG.amber.tint },
  { label: "BOLDEST", sub: "The horizon",             color: "#888",        bg: "transparent", dashed: true },
];

export default function BolderPage() {
  const { session, currentParticipant, participants } = useSession();
  const { items: bolderNotes } = useEntries<BolderNote>(
    "bolder_notes",
    session?.id ?? null,
  );

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

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
        <p className="text-xs text-ink-ghost mb-7">~ 40 mins</p>

        <Card accent={COLORS[3].hex} className="mb-6">
          <Eyebrow color={COLORS[3].hex}>THE QUESTION</Eyebrow>
          <h2 className="text-2xl font-medium text-navy leading-tight">
            How do we support workstream leads in keeping an eye on the future
            while executing Bold today?
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
