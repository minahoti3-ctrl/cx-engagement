"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// All reaction kinds the schema allows. heart/like/q for standard
// reaction bars; green/amber/red for trigger RAG ratings (ambiguity e).
export type ReactionKind = "heart" | "like" | "q" | "green" | "amber" | "red";
export const RAG_KINDS = ["green", "amber", "red"] as const;

// EntryType discriminates which kind of entry a reaction belongs to.
// Must match the schema's CHECK constraint on `reactions.entry_type`.
export type EntryType =
  | "proud_moment"
  | "success_def"
  | "retro_card"
  | "commitment"
  | "org_pin"
  | "bolder_trigger";

type ReactionRow = {
  id: string;
  session_id: string;
  entry_type: EntryType;
  entry_id: string;
  participant_id: string;
  kind: ReactionKind;
};

// Map: entry_id -> kind -> participant_ids who reacted.
export type ReactionMap = Map<string, Partial<Record<ReactionKind, string[]>>>;

// One subscription per session covers every entry_type — we filter
// in-handler. A workshop has at most a few hundred reactions so this
// is cheap, and it means each page only opens one realtime channel
// regardless of how many entry types it uses.
export function useReactions(sessionId: string | null) {
  const [reactions, setReactions] = useState<ReactionMap>(() => new Map());

  useEffect(() => {
    if (!sessionId) {
      setReactions(new Map());
      return;
    }
    let cancelled = false;
    const sb = getSupabase();

    (async () => {
      const { data, error } = await sb
        .from("reactions")
        .select("id, session_id, entry_type, entry_id, participant_id, kind")
        .eq("session_id", sessionId);
      if (cancelled) return;
      if (error) {
        console.error("[useReactions] fetch failed", error);
        return;
      }
      const next: ReactionMap = new Map();
      for (const r of (data ?? []) as ReactionRow[]) {
        const inner = next.get(r.entry_id) ?? {};
        const arr = inner[r.kind] ?? [];
        if (!arr.includes(r.participant_id)) arr.push(r.participant_id);
        inner[r.kind] = arr;
        next.set(r.entry_id, inner);
      }
      setReactions(next);
    })();

    const channel = sb
      .channel(`room:${sessionId}:reactions`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setReactions((prev) => {
            if (payload.eventType === "INSERT") {
              const r = payload.new as ReactionRow;
              const prevInner = prev.get(r.entry_id);
              const prevArr = prevInner?.[r.kind] ?? [];
              if (prevArr.includes(r.participant_id)) return prev;
              const next = new Map(prev);
              next.set(r.entry_id, {
                ...prevInner,
                [r.kind]: [...prevArr, r.participant_id],
              });
              return next;
            }
            if (payload.eventType === "DELETE") {
              // Requires REPLICA IDENTITY FULL on public.reactions
              // (see supabase/migrations/001_reactions_replica_identity_full.sql).
              // Default replica identity only emits the PK on delete, but
              // we key state by entry_id / kind / participant_id.
              const r = payload.old as Partial<ReactionRow>;
              if (!r.entry_id || !r.kind || !r.participant_id) return prev;
              const prevInner = prev.get(r.entry_id);
              const prevArr = prevInner?.[r.kind] ?? [];
              if (!prevArr.includes(r.participant_id)) return prev;
              const next = new Map(prev);
              next.set(r.entry_id, {
                ...prevInner,
                [r.kind]: prevArr.filter((pid) => pid !== r.participant_id),
              });
              return next;
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [sessionId]);

  // Toggle a reaction (insert if missing, delete if present). The unique
  // constraint on (entry_type, entry_id, participant_id, kind) means a
  // racy double-click resolves cleanly — the second insert errors with
  // 23505 and we ignore it.
  const toggleReaction = useCallback(
    async (
      entryType: EntryType,
      entryId: string,
      participantId: string | null,
      kind: ReactionKind,
      sessionIdArg: string | null = sessionId,
    ) => {
      if (!participantId || !sessionIdArg) return;
      const sb = getSupabase();
      const reacted =
        reactions.get(entryId)?.[kind]?.includes(participantId) ?? false;

      if (reacted) {
        const { error } = await sb
          .from("reactions")
          .delete()
          .match({
            entry_type: entryType,
            entry_id: entryId,
            participant_id: participantId,
            kind,
          });
        if (error) console.error("[toggleReaction:delete]", error);
      } else {
        const { error } = await sb.from("reactions").insert({
          session_id: sessionIdArg,
          entry_type: entryType,
          entry_id: entryId,
          participant_id: participantId,
          kind,
        });
        // 23505 = unique violation = race winner already inserted; ignore.
        if (error && (error as { code?: string }).code !== "23505") {
          console.error("[toggleReaction:insert]", error);
        }
      }
    },
    [reactions, sessionId],
  );

  return { reactions, toggleReaction };
}
