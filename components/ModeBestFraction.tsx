import { getModeBestScore } from "@/lib/mode-best-score";
import {
  DIFFICULTY_LABELS,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Profile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ModeBestFractionProps = {
  profile: Profile | null | undefined;
  mode: GameMode;
  scope: GameScope;
  difficulty?: Difficulty;
  className?: string;
};

export function ModeBestFraction({
  profile,
  mode,
  scope,
  difficulty,
  className,
}: ModeBestFractionProps) {
  const activeDifficulty = difficulty ?? profile?.settings.difficulty ?? "medium";
  const score = getModeBestScore(profile, mode, scope, activeDifficulty);
  if (!score) return null;

  const placeNoun = scope === "usa" ? "states" : "countries";
  const label = `Best single-game ${DIFFICULTY_LABELS[activeDifficulty]} score: ${score.correct} out of ${score.total} ${placeNoun}`;

  return (
    <span
      aria-label={label}
      className={cn(
        "shrink-0 font-display text-xs font-extrabold tabular-nums text-slate-500 dark:text-slate-400",
        className,
      )}
      title={label}
    >
      {score.correct}/{score.total}
    </span>
  );
}
