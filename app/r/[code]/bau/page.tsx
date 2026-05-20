"use client";

import { useRef, useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { NotesSection, type Note } from "@/app/components/NotesSection";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useBauCriteria, type BauColumn, type BauCriteriaShape } from "@/hooks/useBauCriteria";
import { useEntries } from "@/hooks/useEntries";
import { COLORS } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

type BauNote = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

const COLUMN_DEFS: ReadonlyArray<{
  key: Exclude<BauColumn, "tray">;
  label: string;
  dot: string;
  bg: string;
}> = [
  { key: "must", label: "MUST BE TRUE",   dot: "#3B6D11", bg: "#EAF3DE" },
  { key: "nice", label: "NICE TO HAVE",   dot: "#C97A0E", bg: "#FDF1DE" },
  { key: "risk", label: "NOT YET · RISK", dot: "#A32D2D", bg: "#FCEBEB" },
];

export default function BauPage() {
  const { session, currentParticipant, participants } = useSession();
  const { criteria, loaded, updateCriteria } = useBauCriteria(session?.id ?? null);
  const { items: bauNotes } = useEntries<BauNote>("bau_notes", session?.id ?? null);

  const [newCriterion, setNewCriterion] = useState("");
  const draggedRef = useRef<{ text: string; from: BauColumn } | null>(null);
  const [dragOver, setDragOver] = useState<BauColumn | null>(null);

  if (!criteria || !loaded) {
    return (
      <main className="page-shell">
        <div className="text-sm text-ink-faint">Loading BAU criteria…</div>
      </main>
    );
  }

  // --- drag/drop / click / delete / add ---

  const moveItem = (text: string, from: BauColumn, to: BauColumn) => {
    if (from === to) return;
    const next: BauCriteriaShape = {
      must: [...criteria.must],
      nice: [...criteria.nice],
      risk: [...criteria.risk],
      tray: [...criteria.tray],
    };
    next[from] = next[from].filter((x) => x !== text);
    if (!next[to].includes(text)) next[to].push(text);
    updateCriteria(next);
  };

  const deleteItem = (text: string, from: BauColumn) => {
    const next: BauCriteriaShape = {
      must: [...criteria.must],
      nice: [...criteria.nice],
      risk: [...criteria.risk],
      tray: [...criteria.tray],
    };
    next[from] = next[from].filter((x) => x !== text);
    updateCriteria(next);
  };

  const addNewCriterion = () => {
    const trimmed = newCriterion.trim();
    if (!trimmed) return;
    const all = [
      ...criteria.must,
      ...criteria.nice,
      ...criteria.risk,
      ...criteria.tray,
    ];
    if (all.includes(trimmed)) {
      setNewCriterion("");
      return;
    }
    updateCriteria({ ...criteria, tray: [...criteria.tray, trimmed] });
    setNewCriterion("");
  };

  const onDragStart = (e: React.DragEvent, text: string, from: BauColumn) => {
    draggedRef.current = { text, from };
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", text);
    } catch {
      // ignore — older browsers
    }
  };
  const onDragEnd = () => {
    draggedRef.current = null;
    setDragOver(null);
  };
  const onDragOver = (e: React.DragEvent, to: BauColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== to) setDragOver(to);
  };
  const onDragLeave = (to: BauColumn) => {
    if (dragOver === to) setDragOver(null);
  };
  const onDrop = (e: React.DragEvent, to: BauColumn) => {
    e.preventDefault();
    setDragOver(null);
    const d = draggedRef.current;
    if (!d) return;
    moveItem(d.text, d.from, to);
    draggedRef.current = null;
  };

  // --- bau notes ---
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
    const p = participants.find((x) => x.id === n.participant_id);
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
            What does it look like when a workstream has truly achieved its
            goals — and is ready for BAU?
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

        <Eyebrow color={COLORS[2].hex}>SORT THE CRITERIA</Eyebrow>
        <h3 className="text-lg font-medium text-navy mb-1.5">
          Drag each criterion to the right column
        </h3>
        <p className="text-xs text-ink-faint mb-4">
          Drag the pills from the tray below into a column. Click any sorted
          item to send it back to the tray. Hover and click × to remove a
          criterion.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {COLUMN_DEFS.map((col) => (
            <div
              key={col.key}
              onDragOver={(e) => onDragOver(e, col.key)}
              onDragLeave={() => onDragLeave(col.key)}
              onDrop={(e) => onDrop(e, col.key)}
              className="rounded-2xl p-3.5 min-h-[200px] transition"
              style={{
                background: col.bg,
                outline:
                  dragOver === col.key
                    ? `2px solid ${col.dot}`
                    : "none",
                outlineOffset: -2,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: col.dot }}
                />
                <div
                  className="text-[11px] font-medium tracking-[1px]"
                  style={{ color: col.dot }}
                >
                  {col.label}
                </div>
              </div>
              {criteria[col.key].length === 0 ? (
                <div className="text-center text-[11px] italic text-ink-ghost py-7">
                  Drop here
                </div>
              ) : (
                criteria[col.key].map((item) => (
                  <CriterionPill
                    key={item}
                    text={item}
                    from={col.key}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onClick={() => moveItem(item, col.key, "tray")}
                    onDelete={() => deleteItem(item, col.key)}
                    clickHint="Click to send back to tray, or drag"
                  />
                ))
              )}
            </div>
          ))}
        </div>

        {/* Tray */}
        <div
          onDragOver={(e) => onDragOver(e, "tray")}
          onDragLeave={() => onDragLeave("tray")}
          onDrop={(e) => onDrop(e, "tray")}
          className="rounded-2xl p-3.5 mb-4 transition"
          style={{
            background: "#FAFAF7",
            outline: dragOver === "tray" ? "2px solid #888" : "none",
            outlineOffset: -2,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-medium tracking-[1px] text-ink-faint">
              CRITERIA TRAY · DRAG TO A COLUMN
            </div>
            <div className="text-[11px] text-ink-ghost">
              {criteria.tray.length} in tray
            </div>
          </div>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {criteria.tray.length === 0 ? (
              <div className="text-[13px] italic text-ink-ghost p-1">
                Tray empty — all criteria sorted.
              </div>
            ) : (
              criteria.tray.map((item) => (
                <CriterionPill
                  key={item}
                  text={item}
                  from="tray"
                  rounded
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onClick={null /* tray click is a no-op */}
                  onDelete={() => deleteItem(item, "tray")}
                  clickHint="Drag to a column"
                />
              ))
            )}
          </div>
          <div className="flex gap-2 pt-2.5 border-t border-black/[0.08]">
            <input
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNewCriterion();
                }
              }}
              placeholder="+ add a new criterion..."
              className="flex-1 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white text-xs outline-none focus:border-navy"
            />
            <PillButton
              variant="secondary"
              onClick={addNewCriterion}
              disabled={!newCriterion.trim()}
            >
              Add
            </PillButton>
          </div>
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
// CriterionPill — draggable item used in both columns and tray.
// ============================================================

function CriterionPill({
  text,
  from,
  rounded = false,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  clickHint,
}: {
  text: string;
  from: BauColumn;
  rounded?: boolean; // true => pill-style (tray uses this)
  onDragStart: (e: React.DragEvent, text: string, from: BauColumn) => void;
  onDragEnd: () => void;
  onClick: (() => void) | null;
  onDelete: () => void;
  clickHint: string;
}) {
  const [hover, setHover] = useState(false);
  const baseRounded = rounded ? "rounded-full" : "rounded-lg";
  const baseDisplay = rounded ? "inline-flex" : "flex";
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, text, from)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // ignore clicks that originated on the × button
        if ((e.target as HTMLElement).dataset.deleteBtn === "1") return;
        onClick?.();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={clickHint}
      style={{
        cursor: onClick ? "pointer" : "grab",
        boxShadow: hover ? "0 2px 6px rgba(0,0,0,0.06)" : undefined,
      }}
      className={`${baseDisplay} ${baseRounded} items-center gap-2 bg-white px-3 py-1.5 text-xs border border-black/[0.08] mb-1.5 transition ${rounded ? "mr-1" : ""}`}
    >
      <span className="flex-1 break-words">{text}</span>
      <button
        type="button"
        data-delete-btn="1"
        aria-label="Remove criterion"
        title="Remove criterion"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[14px] leading-none transition"
        style={{
          background: "transparent",
          color: hover ? "#A32D2D" : "#bbb",
          opacity: hover ? 1 : 0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
