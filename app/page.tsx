"use client";

import { useState } from "react";
import { COLORS } from "@/lib/colors";
import { Banner } from "@/app/components/Banner";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { Modal } from "@/app/components/Modal";
import { NotesSection, type Note } from "@/app/components/NotesSection";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PillButton } from "@/app/components/PillButton";
import { ReactionBar, type Reactions } from "@/app/components/ReactionBar";
import { ShapesBg } from "@/app/components/ShapesBg";

// Step 3 visual sanity check. Will be replaced by the Welcome page in Step 4.
export default function DesignSystemPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [reactions, setReactions] = useState<Reactions>({ heart: ["me"], like: [], q: [] });
  const [notes, setNotes] = useState<Note[]>([
    { id: "1", text: "Worth keeping the cadence weekly — bi-weekly lost momentum.", participant_name: "Sara", participant_color_idx: 2 },
    { id: "2", text: "Re-scope VMO before October.\nTwo crew unsure of remit.", participant_name: "Devon", participant_color_idx: 3 },
  ]);

  const toggleReaction = (k: "heart" | "like" | "q") =>
    setReactions((r) => ({
      ...r,
      [k]: r[k].includes("me") ? r[k].filter((x) => x !== "me") : [...r[k], "me"],
    }));

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        <div className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-navy text-white tracking-wider mb-6">
          DESIGN SYSTEM · STEP 3 PREVIEW
        </div>
        <h1 className="text-[38px] font-medium leading-tight max-w-2xl mb-2 text-navy">
          Tokens, components, and the look the workshop will wear.
        </h1>
        <p className="text-sm text-ink-mute max-w-md mb-10">
          This page disappears when Step 4 lands the real Welcome screen.
        </p>

        {/* Color palette */}
        <Eyebrow color="var(--color-magenta)">PARTICIPANT PALETTE</Eyebrow>
        <h2 className="text-2xl font-medium mb-4 text-navy">Five colors, by join order</h2>
        <div className="grid grid-cols-5 gap-3 mb-10">
          {COLORS.map((c, i) => (
            <div key={c.name} className="rounded-2xl p-4" style={{ background: c.tint }}>
              <ParticipantBadge name={`P${i + 1}`} colorIdx={i} size="lg" />
              <div className="mt-3 text-sm font-medium capitalize" style={{ color: c.dark }}>
                {c.name}
              </div>
              <div className="text-[10px]" style={{ color: c.dark, opacity: 0.7 }}>
                idx {i} · {c.hex}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <Eyebrow color="var(--color-cobalt)">BUTTONS</Eyebrow>
        <Card className="mb-10">
          <div className="flex flex-wrap gap-3 items-center">
            <PillButton>Primary</PillButton>
            <PillButton variant="secondary">Secondary</PillButton>
            <PillButton variant="ghost">Ghost</PillButton>
            <PillButton disabled>Disabled</PillButton>
            <PillButton color={COLORS[0].hex}>Magenta primary</PillButton>
            <PillButton variant="secondary" color={COLORS[3].hex}>Amber secondary</PillButton>
          </div>
        </Card>

        {/* Reactions + notes-like row */}
        <Eyebrow color="var(--color-amber-brand)">REACTIONS</Eyebrow>
        <Card className="mb-10">
          <div className="flex gap-3">
            <ParticipantBadge name="Mina" colorIdx={1} />
            <div className="flex-1">
              <div className="text-[11px] font-medium mb-0.5 text-navy-dark">Mina</div>
              <p className="text-sm text-navy-dark">
                The shift from activity reporting to outcome scorecards is the unlock.
              </p>
              <ReactionBar
                reactions={reactions}
                currentParticipantId="me"
                onToggle={toggleReaction}
              />
            </div>
          </div>
        </Card>

        {/* Banner */}
        <Banner background={COLORS[1].hex} className="mb-10">
          <h1 className="text-[36px] font-medium leading-tight">We're 6 months in! 🎉</h1>
          <p className="text-sm opacity-80 mt-2">Banner component preview.</p>
        </Banner>

        {/* Modal trigger */}
        <Eyebrow color="var(--color-lavender)">MODAL</Eyebrow>
        <Card className="mb-10">
          <PillButton onClick={() => setModalOpen(true)}>Open modal</PillButton>
        </Card>

        {/* NotesSection */}
        <NotesSection
          notes={notes}
          currentParticipantColorIdx={1}
          onSubmit={(text) =>
            setNotes((ns) => [
              ...ns,
              {
                id: String(Date.now()),
                text,
                participant_name: "Mina",
                participant_color_idx: 1,
              },
            ])
          }
          placeholder="Capture decisions, points of tension, follow-ups..."
        />

        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <Eyebrow color={COLORS[0].hex}>SUCCESS STORY</Eyebrow>
          <h2 className="text-2xl font-medium mb-1 text-navy">L&D pilot is working</h2>
          <div className="text-sm text-ink-faint mb-5">4 Early Experience Teams in flight</div>
          <div
            className="p-5 rounded-2xl text-sm leading-relaxed"
            style={{ background: COLORS[0].tint, color: COLORS[0].dark }}
          >
            Modal body content. Sized to match the reference's story-detail modals on the Celebrate page.
          </div>
        </Modal>
      </div>
    </main>
  );
}
