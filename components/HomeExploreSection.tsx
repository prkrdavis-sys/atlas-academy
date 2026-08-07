"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ModeBestFraction } from "@/components/ModeBestFraction";
import { ProfileRequiredDialog } from "@/components/ProfileRequiredDialog";
import { FriendsShortcutButton } from "@/components/social/FriendsShortcutButton";
import { resolvePlayConfig } from "@/lib/game-setup";
import { getLoginStreak } from "@/lib/login-streak";
import { getScopedModeInfo, scopedHref, scopeQuery, SCOPE_INFO } from "@/lib/scope";
import { playSound } from "@/lib/sound";
import {
  getCommonlyMissedCountries,
  sumStatAcrossDifficulties,
} from "@/lib/stats-helpers";
import { getStreakTier } from "@/lib/streak-tier";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import {
  EXTRA_QUIZ_MODES,
  PLAY_MODES,
  type GameMode,
  type GameScope,
  type GlobalStreakSnapshot,
  type Profile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Modes that work as a fixed 20-question round. */
const RANDOM_ROUND_MODES: GameMode[] = [
  ...PLAY_MODES,
  ...EXTRA_QUIZ_MODES.filter((mode) => mode !== "atlasle"),
];

const SUGGESTED_ROUND_LENGTH = 20;

function pickRandomMode(exclude?: GameMode): GameMode {
  const pool =
    exclude && RANDOM_ROUND_MODES.length > 1
      ? RANDOM_ROUND_MODES.filter((mode) => mode !== exclude)
      : RANDOM_ROUND_MODES;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

type HomeExploreSectionProps = {
  profile: Profile | null;
  scope: GameScope;
  streak: GlobalStreakSnapshot;
  todayBest: number;
  dailyRun: number;
  dailyCompletedToday: boolean;
  /** Re-roll the random suggestion whenever this becomes true (home visits). */
  active: boolean;
  onRefresh: () => void;
  className?: string;
};

export function HomeExploreSection({
  profile,
  scope,
  streak,
  todayBest,
  dailyRun,
  dailyCompletedToday,
  active,
  onRefresh,
  className,
}: HomeExploreSectionProps) {
  const router = useRouter();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [suggestedMode, setSuggestedMode] = useState<GameMode | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestedMode((current) => pickRandomMode(current ?? undefined));
  }, [active]);

  const hideProfileDialog = useCallback(() => setShowProfileDialog(false), []);

  const startSuggestedGame = useCallback(() => {
    if (!profile || !suggestedMode) {
      setShowProfileDialog(true);
      return;
    }

    playSound("play", profile);

    const resolved = resolvePlayConfig(profile, suggestedMode, scope);

    if (resolved.fallbackMessage) {
      setToast(resolved.fallbackMessage);
      window.setTimeout(() => setToast(null), 4000);
    }

    updateProfileSettings(profile.id, {
      lastSelectedMode: resolved.mode,
      roundQuestionCount: SUGGESTED_ROUND_LENGTH,
      challengeModifier: "none",
    });
    recordModeSelection(profile.id, resolved.mode);
    onRefresh();

    router.push(scopedHref(`/play/${resolved.mode}`, scope, { autostart: "1" }));
  }, [profile, suggestedMode, scope, onRefresh, router]);

  const startWeakSpots = useCallback(() => {
    if (!profile) {
      setShowProfileDialog(true);
      return;
    }

    playSound("play", profile);
    const resolved = resolvePlayConfig(profile, "weak-spots", scope);

    if (resolved.fallbackMessage) {
      setToast(resolved.fallbackMessage);
      window.setTimeout(() => setToast(null), 4000);
    }

    updateProfileSettings(profile.id, {
      lastSelectedMode: resolved.mode,
      challengeModifier: "none",
    });
    recordModeSelection(profile.id, resolved.mode);
    onRefresh();

    router.push(scopedHref(`/play/${resolved.mode}`, scope, { autostart: "1" }));
  }, [profile, scope, onRefresh, router]);

  const modeInfo = suggestedMode ? getScopedModeInfo(suggestedMode, scope) : null;
  const scopeInfo = SCOPE_INFO[scope];
  const streakTier = getStreakTier(streak.currentStreak);
  const loginStreak = profile ? getLoginStreak(profile.loginStreak) : 0;
  const weakSpotCount = profile ? getCommonlyMissedCountries(profile, scope).length : 0;
  const totalPlayed = profile ? sumStatAcrossDifficulties(profile, "totalPlayed", scope) : 0;
  const totalCorrect = profile ? sumStatAcrossDifficulties(profile, "totalCorrect", scope) : 0;
  const accuracy =
    totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : null;

  return (
    <>
      <ProfileRequiredDialog open={showProfileDialog} onClose={hideProfileDialog} />

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100"
        >
          {toast}
        </div>
      ) : null}

      <div className={cn("mx-auto w-full max-w-xl space-y-5 pb-6 pt-8", className)}>
        <div className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em]">
            Explore
          </span>
        </div>

        {/* Random 20-question suggestion — re-rolls each home visit */}
        <button
          type="button"
          onClick={startSuggestedGame}
          disabled={!modeInfo}
          className="group flex w-full items-center gap-3.5 rounded-2xl border border-teal-500/35 bg-gradient-to-br from-teal-500/15 via-white/60 to-emerald-400/10 p-4 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-teal-500/60 hover:from-teal-500/25 dark:border-teal-300/30 dark:from-teal-400/15 dark:via-white/[0.06] dark:to-emerald-400/10 dark:hover:border-teal-300/55 sm:p-5"
        >
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-2xl transition-transform group-hover:scale-105 dark:bg-teal-400/15 sm:size-14 sm:text-3xl"
          >
            {modeInfo?.icon ?? "🎲"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
              Surprise round · 20 questions
            </p>
            <h2 className="mt-0.5 font-display text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
              {modeInfo?.title ?? "Picking a mode…"}
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
              {modeInfo?.description ?? "A fresh mode each visit"}
            </p>
          </div>
          <span className="flex min-h-10 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-600 px-4 font-display text-sm font-extrabold text-white shadow-[0_3px_0_var(--color-teal-800)] transition-transform group-hover:scale-105 dark:bg-teal-500">
            {suggestedMode ? (
              <ModeBestFraction
                profile={profile}
                mode={suggestedMode}
                scope={scope}
                className="text-[0.65rem] text-white/90"
              />
            ) : null}
            <span>Play</span>
          </span>
        </button>

        {/* Shortcuts not already on the default hero */}
        <section aria-label="Shortcuts">
          <h2 className="mb-2.5 px-1 font-display text-sm font-extrabold text-slate-800 dark:text-slate-100">
            Jump in
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <ShortcutButton href="/stats" icon="📊" label="Stats" />
            <ShortcutButton href="/daily-challenge" icon="🏆" label="Leaderboard" />
            <FriendsShortcutButton scope={scope} />
            <button type="button" onClick={startWeakSpots} className={shortcutClassName}>
              <span aria-hidden className="text-xl">
                🎯
              </span>
              <span className="font-display text-sm font-extrabold text-slate-900 dark:text-white">
                Practice
              </span>
              <span className="text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
                {weakSpotCount > 0
                  ? `${weakSpotCount} weak spot${weakSpotCount === 1 ? "" : "s"}`
                  : "Weak spots"}
              </span>
            </button>
          </div>
        </section>

        <section
          aria-label="Streaks and progress"
          className="rounded-2xl border border-slate-900/10 bg-white/60 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-extrabold text-slate-800 dark:text-slate-100">
              Your streaks
            </h2>
            {profile ? (
              <Link
                href="/stats"
                className="text-xs font-bold text-teal-700 hover:underline dark:text-teal-300"
              >
                Full stats ›
              </Link>
            ) : null}
          </div>

          {profile ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <StatChip
                  icon={streakTier.emoji}
                  label="Answer streak"
                  value={String(streak.currentStreak)}
                  hint={streak.bestStreak > 0 ? `Best ${streak.bestStreak}` : streakTier.label}
                />
                <StatChip
                  icon="🌟"
                  label="Today's best"
                  value={String(todayBest)}
                  hint="This difficulty"
                />
                <StatChip
                  icon="🔥"
                  label="Login streak"
                  value={`${loginStreak}d`}
                  hint={loginStreak > 0 ? "Keep showing up" : "Open daily"}
                />
                <StatChip
                  icon="📅"
                  label="Daily run"
                  value={`${dailyRun}d`}
                  hint={
                    dailyCompletedToday
                      ? "Secured today"
                      : dailyRun > 0
                        ? "Finish today's daily"
                        : "Start a daily"
                  }
                />
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-900/8 pt-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">
                <span>
                  {totalPlayed.toLocaleString()} {scopeInfo.nounPlural} played
                </span>
                {accuracy !== null ? <span>{accuracy}% accuracy</span> : null}
                {weakSpotCount > 0 ? (
                  <span>{weakSpotCount} commonly missed</span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Create a profile to track answer streaks, login streaks, daily runs, and
              progress across {scopeInfo.nounPlural}.
            </p>
          )}
        </section>

        <section aria-label="More modes">
          <h2 className="mb-2.5 px-1 font-display text-sm font-extrabold text-slate-800 dark:text-slate-100">
            More ways to play
          </h2>
          <div className="flex flex-col gap-2.5">
            {(
              [
                "flag-to-country",
                "shape-to-country",
                "capital-to-country",
                "country-to-capital",
                "flag-crop-to-country",
                "fact-to-country",
                "neighbor-quiz",
                "population-showdown",
              ] as const
            ).map((mode) => {
              const info = getScopedModeInfo(mode, scope);
              if (!info) return null;
              return (
                <Link
                  key={mode}
                  href={`/play/setup/${mode}${scopeQuery(scope)}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/50 px-4 py-3.5 backdrop-blur-md transition-colors hover:border-slate-900/25 hover:bg-white/75 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-white/25 dark:hover:bg-white/10"
                >
                  <span aria-hidden className="text-xl">
                    {info.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-extrabold text-slate-900 dark:text-white">
                      {info.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {info.description}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <ModeBestFraction profile={profile} mode={mode} scope={scope} />
                    <span aria-hidden className="text-slate-400 dark:text-slate-500">
                      ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

const shortcutClassName =
  "flex min-h-[5.5rem] flex-col items-start justify-center gap-0.5 rounded-2xl border border-slate-900/10 bg-white/55 px-3.5 py-3.5 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-slate-900/25 hover:bg-white/80 active:translate-y-0 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-white/25 dark:hover:bg-white/12";

function ShortcutButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link href={href} data-tab-swipe-ignore className={shortcutClassName}>
      <span aria-hidden className="text-xl">
        {icon}
      </span>
      <span className="font-display text-sm font-extrabold text-slate-900 dark:text-white">
        {label}
      </span>
    </Link>
  );
}

function StatChip({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-900/8 bg-white/50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]",
      )}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span aria-hidden className="mr-1">
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="truncate text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
        {hint}
      </p>
    </div>
  );
}
