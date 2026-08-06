"use client";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { cn } from "@/lib/utils";

type VersusPlayer = {
  displayName: string;
  avatarId: string | null;
  avatarColor: string;
  score: number;
};

/** Both players, their live scores, and which question the match is on. */
export function VersusScoreBar({
  you,
  opponent,
  questionNumber,
  questionCount,
  opponentConnected,
}: {
  you: VersusPlayer;
  opponent: VersusPlayer;
  questionNumber: number;
  questionCount: number;
  opponentConnected: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white/90 px-2.5 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:gap-3 sm:px-3">
      <PlayerChip player={you} align="start" label="You" connected />

      <div className="shrink-0 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Q{questionNumber}/{questionCount}
        </p>
        <p className="font-display text-lg font-extrabold leading-none tabular-nums text-slate-900 dark:text-white sm:text-xl">
          {you.score}
          <span className="mx-1 text-slate-300 dark:text-slate-600">–</span>
          {opponent.score}
        </p>
      </div>

      <PlayerChip
        player={opponent}
        align="end"
        label={opponentConnected ? "Opponent" : "Reconnecting…"}
        connected={opponentConnected}
      />
    </div>
  );
}

function PlayerChip({
  player,
  align,
  label,
  connected,
}: {
  player: VersusPlayer;
  align: "start" | "end";
  label: string;
  connected: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "end" && "flex-row-reverse text-right",
      )}
    >
      <ProfileAvatar
        avatarId={player.avatarId ?? undefined}
        avatarColor={player.avatarColor}
        size="sm"
        alt=""
        className={cn(!connected && "opacity-40 grayscale")}
      />
      <div className="min-w-0">
        <p className="truncate font-display text-xs font-extrabold text-slate-900 dark:text-white sm:text-sm">
          {player.displayName}
        </p>
        <p
          className={cn(
            "truncate text-[9px] font-black uppercase tracking-[0.14em]",
            connected
              ? "text-slate-400 dark:text-slate-500"
              : "text-amber-600 dark:text-amber-400",
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
