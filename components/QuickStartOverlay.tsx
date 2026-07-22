"use client";

import { useCallback, useEffect, useState } from "react";
import { getQuestionTypeLabel, getRoundCountLabel } from "@/lib/game-setup";
import { getScopedModeInfo, scopeText, SCOPE_INFO } from "@/lib/scope";
import { getTodayBestStreakDisplay, getTodayBestStreakOrZero } from "@/lib/stats-helpers";
import {
  DIFFICULTY_LABELS,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Profile,
  type SpeedRoundQuestionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const OVERLAY_DURATION_MS = 3000;

type QuickStartOverlayProps = {
  mode: GameMode;
  scope: GameScope;
  difficulty: Difficulty;
  roundQuestionCount: Profile["settings"]["roundQuestionCount"];
  questionType?: SpeedRoundQuestionType;
  profile: Profile;
  dailyDateLabel?: string | null;
  dailyRun?: number;
  dailyCompletedToday?: boolean;
  onDismiss: () => void;
};

export function QuickStartOverlay({
  mode,
  scope,
  difficulty,
  roundQuestionCount,
  questionType,
  profile,
  dailyDateLabel,
  dailyRun = 0,
  dailyCompletedToday = false,
  onDismiss,
}: QuickStartOverlayProps) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const [progress, setProgress] = useState(0);
  const modeInfo = getScopedModeInfo(mode, scope);
  const scopeInfo = SCOPE_INFO[scope];
  const isDaily = mode === "daily-challenge";

  const dismiss = useCallback(() => {
    setPhase("exit");
    window.setTimeout(onDismiss, 200);
  }, [onDismiss]);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setPhase("visible"), 20);
    return () => window.clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      setProgress(Math.min(elapsed / OVERLAY_DURATION_MS, 1));
      if (elapsed >= OVERLAY_DURATION_MS) {
        dismiss();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [dismiss]);

  useEffect(() => {
    const handleKeyDown = () => dismiss();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismiss]);

  const todayBest = getTodayBestStreakDisplay(profile, difficulty, scope);
  const storedTodayBest = getTodayBestStreakOrZero(profile, difficulty, scope);

  let statLine = "";
  if (isDaily && dailyDateLabel) {
    if (dailyRun > 0 && !dailyCompletedToday) {
      statLine = `${dailyRun}-day daily run on the line`;
    } else if (dailyRun > 0 && dailyCompletedToday) {
      statLine = `${dailyRun}-day daily run secured`;
    } else {
      statLine = `Today's challenge · ${dailyDateLabel}`;
    }
  } else if (storedTodayBest > 0) {
    statLine = `Today's best: ${todayBest} · beat ${storedTodayBest}`;
  } else if (todayBest > 0) {
    statLine = `Today's best: ${todayBest}`;
  }

  return (
    <button
      type="button"
      aria-label="Starting game"
      onClick={dismiss}
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[2px]"
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-[1.75rem] border border-white/20 bg-white/95 p-5 text-left shadow-2xl dark:bg-slate-900/95 motion-safe:transition-all motion-safe:duration-200",
          phase === "enter" && "motion-safe:scale-95 motion-safe:opacity-0",
          phase === "visible" && "motion-safe:scale-100 motion-safe:opacity-100",
          phase === "exit" && "motion-safe:scale-[0.98] motion-safe:opacity-0",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>
            {modeInfo?.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {modeInfo ? scopeText(modeInfo.title, scope) : mode}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {!isDaily ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {DIFFICULTY_LABELS[difficulty]}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {getRoundCountLabel(mode, roundQuestionCount)}
              </span>
              {(mode === "speed-round" || mode === "marathon") && questionType ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {getQuestionTypeLabel(questionType, scope)}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {scopeInfo.icon} {scopeInfo.shortLabel}
              </span>
            </div>
            {statLine ? (
              <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-400">{statLine}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-75 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </button>
  );
}
