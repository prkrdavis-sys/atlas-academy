"use client";

import { useRouter } from "next/navigation";
import { GameActionButton } from "@/components/GameActionButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useProfiles } from "@/components/ProfileProvider";
import type { MatchRow, PlayerRow } from "@/lib/social/types";
import { cn } from "@/lib/utils";

function outcomeCopy(match: MatchRow, userId: string) {
  if (match.status === "abandoned") {
    return match.winner_id === userId
      ? { eyebrow: "Forfeit", title: "Your opponent left", icon: "🏳️" }
      : { eyebrow: "Forfeit", title: "You left the match", icon: "🏳️" };
  }
  if (match.winner_id === null) return { eyebrow: "Dead heat", title: "It's a draw", icon: "🤝" };
  return match.winner_id === userId
    ? { eyebrow: "Victory", title: "You win", icon: "🏆" }
    : { eyebrow: "Defeat", title: "You lost this one", icon: "🎯" };
}

export function VersusSummary({
  match,
  userId,
  opponent,
  yourScore,
  opponentScore,
}: {
  match: MatchRow;
  userId: string;
  opponent: PlayerRow;
  yourScore: number;
  opponentScore: number;
}) {
  const router = useRouter();
  const { activeProfile } = useProfiles();
  const outcome = outcomeCopy(match, userId);
  const won = match.winner_id === userId;

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[1.75rem] border-2 border-teal-200 bg-white p-6 text-center shadow-[0_24px_60px_rgb(15_23_42_/_0.25)] dark:border-teal-800 dark:bg-slate-900 sm:p-8">
        <p aria-hidden className="text-5xl">
          {outcome.icon}
        </p>
        <p className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
          {outcome.eyebrow}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {outcome.title}
        </h1>

        <div className="mt-6 flex items-stretch gap-3">
          <ScoreCard
            name={activeProfile?.name ?? "You"}
            avatarId={activeProfile?.avatarId ?? null}
            avatarColor={activeProfile?.avatarColor ?? ""}
            score={yourScore}
            highlighted={won}
          />
          <ScoreCard
            name={opponent.display_name}
            avatarId={opponent.avatar_id}
            avatarColor={opponent.avatar_color}
            score={opponentScore}
            highlighted={match.winner_id !== null && !won}
          />
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Head-to-head rounds are tracked separately from your solo stats.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <GameActionButton icon="🌎" onClick={() => router.push("/")}>
            Back home
          </GameActionButton>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  name,
  avatarId,
  avatarColor,
  score,
  highlighted,
}: {
  name: string;
  avatarId: string | null;
  avatarColor: string;
  score: number;
  highlighted: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4",
        highlighted
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
      )}
    >
      <ProfileAvatar
        avatarId={avatarId ?? undefined}
        avatarColor={avatarColor}
        size="md"
        alt=""
      />
      <p className="w-full truncate font-display text-xs font-extrabold text-slate-900 dark:text-white">
        {name}
      </p>
      <p className="font-display text-3xl font-extrabold tabular-nums leading-none text-slate-900 dark:text-white">
        {score}
      </p>
    </div>
  );
}
