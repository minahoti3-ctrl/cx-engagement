"use client";

import { useRef, useState } from "react";
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
import { COLORS, colorForIdx } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

type MonthKey = "jul" | "aug" | "sep" | "oct" | "nov" | "dec" | "jan";

type OrgPin = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  month: MonthKey | null;
  created_at: string;
};

type OrgNote = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

type DropTarget = MonthKey | "tray";

const MONTHS: ReadonlyArray<{
  key: MonthKey;
  label: string;
  sub: string;
  color: string;
  filled: boolean;
}> = [
  { key: "jul", label: "Jul 2026", sub: "Messy by design", color: COLORS[3].hex, filled: true  },
  { key: "aug", label: "Aug 2026", sub: "",                color: "#999",        filled: false },
  { key: "sep", label: "Sep 2026", sub: "",                color: "#999",        filled: false },
  { key: "oct", label: "Oct 2026", sub: "Must be stable",  color: COLORS[1].hex, filled: true  },
  { key: "nov", label: "Nov 2026", sub: "",                color: "#999",        filled: false },
  { key: "dec", label: "Dec 2026", sub: "",                color: "#999",        filled: false },
  { key: "jan", label: "Jan 2027", sub: "The horizon",     color: COLORS[4].hex, filled: true  },
];

export default function OrgEvolutionPage() {
  const { session, currentParticipant, participants } = useSession();
  const { items: pins } = useEntries<OrgPin>("org_pins", session?.id ?? null);
  const { items: orgNotes } = useEntries<OrgNote>("org_notes", session?.id ?? null);
  const { reactions, toggleReaction } = useReactions(session?.id ?? null);

  const [pinDraft, setPinDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const draggedRef = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<DropTarget | null>(null);

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

  // --- pin write ---
  const addPin = async () => {
    const text = pinDraft.trim();
    if (!text || !session || !currentParticipant || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("org_pins").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
      month: null,
    });
    if (error) console.error("[org_pins insert]", error);
    else setPinDraft("");
    setSubmitting(false);
  };

  const movePin = async (pinId: string, newMonth: MonthKey | null) => {
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return;
    if (pin.month === newMonth) return;
    const sb = getSupabase();
    const { error } = await sb
      .from("org_pins")
      .update({ month: newMonth })
      .eq("id", pinId);
    if (error) console.error("[org_pins update]", error);
  };

  // --- drag/drop wiring ---
  const onDragStart = (e: React.DragEvent, pinId: string) => {
    draggedRef.current = pinId;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", pinId);
    } catch {
      // older browsers — closure-scoped draggedRef is the primary signal
    }
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  };
  const onDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "";
    draggedRef.current = null;
    setDragOver(null);
  };
  const onDragOver = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== target) setDragOver(target);
  };
  const onDragLeave = (target: DropTarget) => {
    if (dragOver === target) setDragOver(null);
  };
  const onDrop = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    setDragOver(null);
    const pinId = draggedRef.current ?? e.dataTransfer.getData("text/plain");
    draggedRef.current = null;
    if (!pinId) return;
    movePin(pinId, target === "tray" ? null : target);
  };

  // --- notes ---
  const submitOrgNote = async (text: string) => {
    if (!session || !currentParticipant) return;
    const sb = getSupabase();
    const { error } = await sb.from("org_notes").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("[org_notes insert]", error);
  };

  const notesForSection: Note[] = orgNotes.map((n) => {
    const p = participantById(n.participant_id);
    return {
      id: n.id,
      text: n.text,
      participant_name: p?.name ?? "Unknown",
      participant_color_idx: p?.color_idx ?? 0,
    };
  });

  const unassignedPins = pins.filter((p) => !p.month);

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        <Eyebrow color={COLORS[2].hex}>LOOKING AHEAD · 2 OF 3</Eyebrow>
        <h1 className="text-[38px] font-medium leading-[1.1] text-navy mb-0.5">
          CX org evolution
        </h1>
        <p className="text-xs text-ink-ghost mb-7">~ 40 mins</p>

        <Card accent={COLORS[4].hex} className="mb-6">
          <Eyebrow color={COLORS[4].hex}>THE QUESTION</Eyebrow>
          <h2 className="text-2xl font-medium text-navy leading-tight">
            Are we heading in the right direction — and at the right pace —
            toward the future org?
          </h2>
        </Card>

        <div className="rounded-2xl p-5 mb-6" style={{ background: "#FAFAF7" }}>
          <div className="text-[10px] font-medium tracking-[1px] text-ink-faint mb-3">
            IF THE ROOM GETS QUIET, PULL ON ONE OF THESE
          </div>
          <ul className="list-none text-[13px] text-ink-soft leading-[1.8]">
            <li>• July will be messy by design, but what needs to be stable by October?</li>
            <li>• What proof points will tell us we&apos;ve landed it?</li>
            <li>• What is the VMO&apos;s role in this?</li>
          </ul>
        </div>

        {/* Timeline card */}
        <Card className="mb-6">
          <div className="flex justify-between items-baseline mb-1">
            <div
              className="font-medium text-[15px]"
              style={{ color: COLORS[1].hex }}
            >
              July → beyond runway
            </div>
            <div className="text-[11px] text-ink-faint">
              Drag pins from below onto a month
            </div>
          </div>
          <p className="text-xs text-ink-faint mb-5">
            July is messy by design. What needs to be <em>stable</em> by
            October — and what comes after?
          </p>

          <div
            className="grid relative gap-2.5"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {/* connector line behind the dots */}
            <div
              className="absolute"
              style={{
                top: 11,
                left: "8%",
                right: "8%",
                height: 2,
                background: "rgba(0,0,0,0.08)",
                zIndex: 0,
              }}
            />
            {MONTHS.map((m) => {
              const monthPins = pins.filter((p) => p.month === m.key);
              const isOver = dragOver === m.key;
              return (
                <div
                  key={m.key}
                  className="flex flex-col items-center relative"
                  style={{ zIndex: 1 }}
                >
                  <div
                    className="rounded-full mb-2"
                    style={{
                      width: 24,
                      height: 24,
                      background: m.filled ? m.color : "white",
                      border: m.filled ? "none" : "2px solid #ccc",
                    }}
                  />
                  <div
                    className="text-[13px] font-medium text-center leading-tight"
                    style={{ color: m.color }}
                  >
                    {m.label}
                  </div>
                  <div className="text-[10px] text-ink-faint mb-2.5">
                    {m.sub || " "}
                  </div>
                  <div
                    onDragOver={(e) => onDragOver(e, m.key)}
                    onDragLeave={() => onDragLeave(m.key)}
                    onDrop={(e) => onDrop(e, m.key)}
                    className="w-full rounded-[10px] p-2 transition"
                    style={{
                      minHeight: 90,
                      background: isOver
                        ? "rgba(123, 91, 168, 0.08)"
                        : "#FAFAF7",
                      border: `1px dashed ${
                        isOver
                          ? "rgba(123, 91, 168, 0.4)"
                          : "rgba(0,0,0,0.1)"
                      }`,
                    }}
                  >
                    {monthPins.length === 0 ? (
                      <div
                        className="text-[10px] text-center italic"
                        style={{ color: "#bbb", padding: "14px 4px" }}
                      >
                        drop pin here
                      </div>
                    ) : (
                      monthPins.map((p) => {
                        const author = participantById(p.participant_id);
                        const c = colorForIdx(author?.color_idx ?? 0);
                        const truncated =
                          p.text.length > 60
                            ? p.text.slice(0, 58) + "…"
                            : p.text;
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, p.id)}
                            onDragEnd={onDragEnd}
                            className="rounded-md mb-1"
                            style={{
                              background: c.tint,
                              borderLeft: `3px solid ${c.hex}`,
                              padding: "6px 8px",
                              cursor: "grab",
                              fontSize: 11,
                              lineHeight: 1.3,
                              color: c.dark,
                            }}
                            title={`${author?.name ?? "Unknown"}: ${p.text}`}
                          >
                            {truncated}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Unassigned pins tray (catch-all drop zone) */}
        <div
          onDragOver={(e) => onDragOver(e, "tray")}
          onDragLeave={() => onDragLeave("tray")}
          onDrop={(e) => onDrop(e, "tray")}
          className="bg-white rounded-2xl border-[0.5px] border-black/10 px-6 py-5 mb-3 transition"
          style={{
            outline:
              dragOver === "tray"
                ? "2px solid rgba(123, 91, 168, 0.4)"
                : "none",
            outlineOffset: -2,
          }}
        >
          <Eyebrow color={COLORS[4].hex}>
            PIN WHAT MUST BE STABLE BY OCTOBER
          </Eyebrow>
          <p className="text-xs text-ink-faint mt-2 mb-3">
            Unassigned pins live here. Drag onto a month above to anchor it.
          </p>
          <div className="my-4">
            {unassignedPins.length === 0 ? (
              <div className="text-[13px] italic text-ink-ghost p-3">
                {pins.length === 0
                  ? "Nothing pinned yet — be the first."
                  : "All pins assigned to a month. Drag one back here to unassign."}
              </div>
            ) : (
              unassignedPins.map((p) => {
                const author = participantById(p.participant_id);
                const c = colorForIdx(author?.color_idx ?? 0);
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, p.id)}
                    onDragEnd={onDragEnd}
                    className="flex gap-3 p-3 rounded-xl mb-2"
                    style={{ background: c.tint, cursor: "grab" }}
                    title="Drag onto a month"
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
                      <div className="text-sm" style={{ color: c.dark }}>
                        {p.text}
                      </div>
                      <ReactionBar
                        reactions={reactions.get(p.id) ?? null}
                        currentParticipantId={currentParticipant?.id ?? null}
                        onToggle={(k: ReactionKind) =>
                          toggleReaction(
                            "org_pin",
                            p.id,
                            currentParticipant?.id ?? null,
                            k,
                          )
                        }
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
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPin();
                }}
                placeholder="Share what must be stable..."
                className="flex-1 px-4 py-2.5 rounded-full border border-black/10 bg-white text-sm outline-none focus:border-navy"
              />
              <PillButton
                onClick={addPin}
                disabled={!pinDraft.trim() || submitting}
              >
                Share
              </PillButton>
            </div>
          ) : (
            <div className="text-xs text-ink-faint">
              Join from the welcome page to share.
            </div>
          )}
        </div>

        <NotesSection
          notes={notesForSection}
          currentParticipantColorIdx={currentParticipant?.color_idx ?? null}
          onSubmit={submitOrgNote}
          placeholder="Decisions, open questions, what needs to be true..."
        />
      </div>
    </main>
  );
}
