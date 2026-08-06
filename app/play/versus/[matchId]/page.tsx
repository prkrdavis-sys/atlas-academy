"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { VersusBoard } from "@/components/versus/VersusBoard";
import { loadPlayers } from "@/lib/social/friends";
import { loadMatch } from "@/lib/social/versus";
import type { PlayerRow } from "@/lib/social/types";

export default function VersusPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [opponent, setOpponent] = useState<PlayerRow | null>(null);
  const [failed, setFailed] = useState(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      router.replace("/auth");
      return;
    }

    let cancelled = false;

    async function loadOpponent(currentUserId: string) {
      try {
        const match = await loadMatch(matchId);
        if (!match) {
          if (!cancelled) setFailed(true);
          return;
        }

        const opponentId =
          match.host_id === currentUserId ? match.guest_id : match.host_id;
        const [player] = await loadPlayers([opponentId]);
        if (cancelled) return;

        if (!player) {
          setFailed(true);
          return;
        }
        setOpponent(player);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void loadOpponent(userId);
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId, matchId, router]);

  if (!hydrated || !userId) return null;

  if (failed) {
    return (
      <main className="flex h-dvh items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
            This match is not available
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all duration-100 hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none"
          >
            Back home
          </button>
        </div>
      </main>
    );
  }

  if (!opponent) return null;

  return (
    <main className="h-dvh">
      <VersusBoard matchId={matchId} userId={userId} opponent={opponent} />
    </main>
  );
}
