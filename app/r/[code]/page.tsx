"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { COLORS, colorForIdx } from "@/lib/colors";
import { joinExistingRoom } from "@/lib/rooms";

export default function RoomLanding() {
  const { status, session, participants, currentParticipant } = useSession();

  if (status === "loading") {
    return (
      <main className="page-shell">
        <div className="text-sm text-ink-faint">Loading room…</div>
      </main>
    );
  }

  if (status === "not-found" || !session) {
    return (
      <main className="page-shell">
        <ShapesBg density="sparse" />
        <div className="relative z-10 max-w-md">
          <Eyebrow color="var(--color-rag-red)">ROOM NOT FOUND</Eyebrow>
          <h1 className="text-3xl font-medium text-navy mb-3 leading-tight">
            That code doesn&apos;t match a session.
          </h1>
          <p className="text-sm text-ink-mute mb-6">
            Double-check with whoever shared it, or start fresh.
          </p>
          <Link href="/">
            <PillButton>← Back to join</PillButton>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        <header className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <Eyebrow color="var(--color-magenta)">ROOM</Eyebrow>
            <div className="font-medium text-3xl text-navy tracking-[3px]">
              {session.code}
            </div>
          </div>
          {currentParticipant ? (
            <YouBlock
              name={currentParticipant.name}
              colorIdx={currentParticipant.color_idx}
            />
          ) : null}
        </header>

        {!currentParticipant ? <JoinAsNew /> : null}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <Eyebrow color="var(--color-cobalt)" className="mb-0">
              IN THE ROOM
            </Eyebrow>
            <div className="text-xs text-ink-faint">
              {participants.length}{" "}
              {participants.length === 1 ? "person" : "people"}
            </div>
          </div>
          {participants.length === 0 ? (
            <div className="text-sm text-ink-faint italic">
              No one here yet — be the first to join.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const c = colorForIdx(p.color_idx);
                const isMe = currentParticipant?.id === p.id;
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: c.tint, color: c.dark }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: c.hex }}
                    />
                    {p.name}
                    {isMe ? (
                      <span className="text-[10px] opacity-60 ml-0.5">(you)</span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        <ShareCard code={session.code} />

        <div className="mt-10 text-xs text-ink-faint">
          The full agenda (Welcome · Celebrate · Health check · Commitments · BAU ·
          Org evolution · Bold to bolder · Close) lands next — pages will appear in
          the nav as they ship.
        </div>
      </div>
    </main>
  );
}

function YouBlock({ name, colorIdx }: { name: string; colorIdx: number }) {
  const c = colorForIdx(colorIdx);
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-full"
      style={{ background: c.tint }}
    >
      <ParticipantBadge name={name} colorIdx={colorIdx} size="lg" />
      <div className="leading-tight">
        <div className="font-medium text-sm" style={{ color: c.dark }}>
          {name}
        </div>
        <div className="text-[10px]" style={{ color: c.dark, opacity: 0.7 }}>
          that&apos;s you · {c.name}
        </div>
      </div>
    </div>
  );
}

function JoinAsNew() {
  const { session, participants, setCurrentParticipant } = useSession();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!session) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const p = await joinExistingRoom(session, participants.length, name);
      setCurrentParticipant(p);
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : "Couldn't join — please retry.";
      setErr(msg);
      setBusy(false);
    }
  };

  const previewColor = colorForIdx(participants.length);

  return (
    <Card accent={COLORS[0].hex} className="mb-6">
      <Eyebrow color={COLORS[0].hex}>JOIN THIS ROOM</Eyebrow>
      <h3 className="text-lg font-medium mb-3 text-navy">
        Add your name to join the conversation.
      </h3>
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          autoComplete="given-name"
          className="flex-1 min-w-[180px] px-4 py-2.5 rounded-full border border-black/10 bg-white text-base outline-none focus:border-navy"
        />
        <PillButton type="submit" disabled={busy || !name.trim()}>
          {busy ? "Joining…" : "Join"}
        </PillButton>
      </form>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-faint">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ background: previewColor.hex }}
        />
        You&apos;ll join as <strong className="capitalize">{previewColor.name}</strong> · #{participants.length + 1} in the room.
      </div>
      {err ? (
        <div
          className="text-sm mt-2 px-3 py-2 rounded-lg"
          style={{
            background: "var(--color-rag-red-tint)",
            color: "var(--color-rag-red)",
          }}
        >
          {err}
        </div>
      ) : null}
    </Card>
  );
}

function ShareCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <div className="mt-6 flex items-center gap-3 text-xs text-ink-faint">
      <span>
        Share this room: code <strong className="text-ink tracking-[2px]">{code}</strong>
      </span>
      <button
        type="button"
        onClick={copy}
        className="px-2.5 py-1 rounded-full bg-white border border-black/10 text-[11px] hover:bg-cream transition"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
