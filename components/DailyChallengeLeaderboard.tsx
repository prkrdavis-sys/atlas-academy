"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/AuthProvider";
import { useProfiles } from "@/components/ProfileProvider";
import {
  ensureDailyChallengeResultSubmitted,
  formatDailyElapsedTime,
  loadDailyChallengeLeaderboard,
  loadDailyChallengeSnapshot,
  type DailyChallengeLeaderboardEntry,
} from "@/lib/daily-challenge";
import {
  buildDailyChallengeSnapshot,
  dailyDateKeyToDate,
  getDailyCalendarParts,
  getDailyDateKey,
  offsetDailyDateKey,
  formatDailyDateKey,
  isValidDailyDateKey,
} from "@/lib/game-engine";
import type { DailyChallengeSnapshot, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const FEATURE_LAUNCH_DATE_KEY = "2026-08-06";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeDailyDateKey(stored: string): string {
  return stored.includes(":") ? stored.slice(stored.indexOf(":") + 1) : stored;
}

function dateIsCompleted(completedDates: Set<string>, dateKey: string): boolean {
  return completedDates.has(dateKey);
}

function calendarDateKeys(year: number, month: number, daysInMonth: number): string[] {
  return Array.from({ length: daysInMonth }, (_, index) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
  });
}

function formatMonth(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    year: "numeric",
  }).format(dailyDateKeyToDate(dateKey));
}

function playDateHref(dateKey: string): string {
  return `/play/daily-challenge?date=${encodeURIComponent(dateKey)}`;
}

function formatQuestionType(type: string): string {
  return type
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isCloseTimeResult(
  entries: DailyChallengeLeaderboardEntry[],
  index: number,
): boolean {
  const current = entries[index];
  return entries.some((entry, entryIndex) => {
    if (entryIndex === index || entry.correctCount !== current.correctCount) return false;
    return Math.abs(entry.elapsedCentiseconds - current.elapsedCentiseconds) <= 100;
  });
}

function LeaderboardRow({
  entry,
  showCentiseconds,
  isCurrentProfile,
}: {
  entry: DailyChallengeLeaderboardEntry;
  showCentiseconds: boolean;
  isCurrentProfile: boolean;
}) {
  const accuracy = Math.round((entry.correctCount / entry.questionCount) * 100);
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 px-3 py-3",
        isCurrentProfile
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
          : "border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70",
      )}
    >
      <span className="w-8 text-center font-display text-lg font-black text-slate-500 dark:text-slate-400">
        {entry.rank}
      </span>
      <ProfileAvatar
        avatarId={entry.avatarId ?? undefined}
        avatarColor={entry.avatarColor}
        size="sm"
        alt=""
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900 dark:text-slate-100">
          {entry.displayName}
          {isCurrentProfile ? <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">(you)</span> : null}
        </p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {entry.correctCount}/{entry.questionCount} correct · {accuracy}%
        </p>
      </div>
      <p className="shrink-0 font-display text-lg font-black text-teal-700 dark:text-teal-300">
        {formatDailyElapsedTime(entry.elapsedCentiseconds, showCentiseconds)}
      </p>
    </li>
  );
}

export function DailyChallengeLeaderboard() {
  const { activeProfile, hydrated } = useProfiles();
  if (!hydrated) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-500">Loading profile…</p>;
  }
  if (!activeProfile) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border-2 border-slate-200 bg-white/85 p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <p className="font-display text-xl font-black">Create a profile to view daily challenges</p>
        <Link
          href="/profiles"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none"
        >
          Choose a profile
        </Link>
      </div>
    );
  }
  return <DailyChallengeLeaderboardContent profile={activeProfile} />;
}

function DailyChallengeLeaderboardContent({ profile }: { profile: Profile }) {
  const { user, isGuest } = useAuth();
  const searchParams = useSearchParams();
  const todayKey = getDailyDateKey();
  const requestedDateKey = searchParams.get("date");
  const initialDateKey =
    requestedDateKey &&
    isValidDailyDateKey(requestedDateKey) &&
    requestedDateKey >= FEATURE_LAUNCH_DATE_KEY &&
    requestedDateKey <= todayKey
      ? requestedDateKey
      : todayKey;
  const completedDates = useMemo(
    () => new Set((profile.dailyChallengeCompletions ?? []).map(normalizeDailyDateKey)),
    [profile.dailyChallengeCompletions],
  );
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [viewMonthKey, setViewMonthKey] = useState(initialDateKey.slice(0, 7) + "-01");
  const [entries, setEntries] = useState<DailyChallengeLeaderboardEntry[]>([]);
  const [snapshot, setSnapshot] = useState<DailyChallengeSnapshot | null>(null);
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitRetryKey, setSubmitRetryKey] = useState(0);

  const viewParts = getDailyCalendarParts(dailyDateKeyToDate(viewMonthKey));
  const [viewYear, viewMonth] = viewMonthKey.split("-").map(Number);
  const datesInMonth = calendarDateKeys(viewYear, viewMonth, viewParts.daysInMonth);
  const canGoPrevious = viewMonthKey > FEATURE_LAUNCH_DATE_KEY.slice(0, 7) + "-01";
  const canGoNext = viewMonthKey < todayKey.slice(0, 7) + "-01";
  const selectedDateCompleted = dateIsCompleted(completedDates, selectedDateKey);
  const playerResult = profile.dailyChallengeResults?.[selectedDateKey];

  useEffect(() => {
    let cancelled = false;
    if (!user || isGuest || !selectedDateCompleted) return;

    async function loadBoard() {
      let syncError: string | null = null;

      if (playerResult) {
        try {
          // Local completion unlocks the page; cloud submit can still be missing if
          // an earlier attempt failed. Re-submit before reading so the board is live.
          await ensureDailyChallengeResultSubmitted(profile, playerResult);
        } catch {
          syncError = "We couldn't sync your score to the global leaderboard yet.";
        }
      }

      try {
        const [nextEntries, nextSnapshot] = await Promise.all([
          loadDailyChallengeLeaderboard(selectedDateKey, profile.id),
          loadDailyChallengeSnapshot(selectedDateKey, profile.id),
        ]);
        if (cancelled) return;
        setEntries(nextEntries);
        setSnapshot(nextSnapshot ?? buildDailyChallengeSnapshot(selectedDateKey));
        setLoadedDateKey(selectedDateKey);
        setError(nextEntries.length ? null : syncError);
      } catch {
        if (!cancelled) {
          setError(syncError ?? "The leaderboard could not be loaded right now.");
          setLoadedDateKey(selectedDateKey);
          setSnapshot(buildDailyChallengeSnapshot(selectedDateKey));
          setEntries([]);
        }
      }
    }

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [
    isGuest,
    playerResult,
    profile,
    selectedDateCompleted,
    selectedDateKey,
    submitRetryKey,
    user,
  ]);

  function moveMonth(direction: -1 | 1) {
    const nextMonthKey = offsetDailyDateKey(
      viewMonthKey,
      direction === 1 ? viewParts.daysInMonth : -1,
    );
    setViewMonthKey(`${nextMonthKey.slice(0, 7)}-01`);
  }

  const currentProfileId = profile.id;
  const visibleEntries = loadedDateKey === selectedDateKey ? entries : [];
  const visibleSnapshot = loadedDateKey === selectedDateKey ? snapshot : null;
  const detailedTimeEntries = visibleEntries.filter((_, index) => isCloseTimeResult(visibleEntries, index));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="rounded-[1.75rem] border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-800/70 dark:from-amber-950/40 dark:to-slate-900 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              Daily challenge
            </p>
            <h1 className="mt-1 font-display text-3xl font-black text-slate-900 dark:text-slate-100">
              The daily leaderboard
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              One shared challenge for every explorer. Accuracy comes first; your fastest time breaks ties.
            </p>
          </div>
          <Link
            href={`/play/daily-challenge?date=${todayKey}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none"
          >
            Play today
          </Link>
        </div>
      </header>

      <section className="rounded-[1.75rem] border-2 border-slate-200 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => moveMonth(-1)}
            disabled={!canGoPrevious}
            aria-label="Previous month"
          >
            ←
          </Button>
          <h2 className="font-display text-xl font-black">{formatMonth(viewMonthKey)}</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => moveMonth(1)}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            →
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase text-slate-400 sm:gap-2 sm:text-xs">
          {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: viewParts.firstWeekday }, (_, index) => (
            <span key={`empty-${index}`} aria-hidden />
          ))}
          {datesInMonth.map((dateKey) => {
            const isFuture = dateKey > todayKey;
            const isAvailable = dateKey >= FEATURE_LAUNCH_DATE_KEY && !isFuture;
            const completed = dateIsCompleted(completedDates, dateKey);
            const selected = selectedDateKey === dateKey;
            return (
              <button
                key={dateKey}
                type="button"
                disabled={!isAvailable}
                onClick={() => setSelectedDateKey(dateKey)}
                className={cn(
                  "relative flex aspect-square min-h-10 items-center justify-center rounded-xl border-2 text-sm font-black transition-colors",
                  selected
                    ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                    : "border-transparent text-slate-700 hover:border-slate-200 dark:text-slate-200 dark:hover:border-slate-700",
                  !isAvailable && "cursor-not-allowed text-slate-300 dark:text-slate-700",
                  completed && !selected && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                )}
                aria-label={`${dateKey}${completed ? ", completed" : ""}${isFuture ? ", unavailable" : ""}`}
              >
                {Number(dateKey.slice(-2))}
                {completed ? <span className="absolute bottom-1 size-1 rounded-full bg-emerald-500" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Green dates are completed. Locked dates can be played to unlock their results.
        </p>
      </section>

      <section className="rounded-[1.75rem] border-2 border-slate-200 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
              {selectedDateKey === todayKey ? "Today" : "Selected date"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black">{formatDailyDateKey(selectedDateKey)}</h2>
          </div>
          {!selectedDateCompleted ? (
            <Link
              href={playDateHref(selectedDateKey)}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none"
            >
              Play this challenge
            </Link>
          ) : null}
        </div>

        {!selectedDateCompleted ? (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center dark:border-slate-600">
            <p className="text-3xl" aria-hidden>🔒</p>
            <p className="mt-2 font-display text-lg font-black">Complete this date to unlock it</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Your time and question list will appear here after your first full attempt.
            </p>
          </div>
        ) : !user || isGuest ? (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-amber-300 p-5 text-center dark:border-amber-700">
            <p className="font-display text-lg font-black">Sign in to see the global leaderboard</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Guest progress stays on this device and cannot be submitted globally.
            </p>
            <Link
              href="/auth"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none"
            >
              Sign in
            </Link>
          </div>
        ) : loadedDateKey !== selectedDateKey ? (
          <p className="mt-6 text-center text-sm font-semibold text-slate-500">Loading leaderboard…</p>
        ) : error ? (
          <div className="mt-6 space-y-3 text-center">
            <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
            {playerResult ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLoadedDateKey(null);
                  setSubmitRetryKey((key) => key + 1);
                }}
              >
                Sync my score
              </Button>
            ) : null}
            {visibleSnapshot ? (
              <div className="mt-6 text-left">
                <h3 className="font-display text-xl font-black">Questions included</h3>
                <ol className="mt-3 space-y-2">
                  {visibleSnapshot.questions.map((question, index) => (
                    <li
                      key={question.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Question {index + 1}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {formatQuestionType(question.mode)}
                      </p>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{question.prompt}</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        Answer: {question.correctAnswer}
                      </p>
                      {playerResult?.answers?.[index] ? (
                        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Your answer: {playerResult.answers[index].skipped ? "Skipped" : playerResult.answers[index].answer}
                          {" · "}
                          {playerResult.answers[index].correct ? "Correct" : "Incorrect"}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl font-black">Leaderboard</h3>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{visibleEntries.length} players</span>
              </div>
              {visibleEntries.length ? (
                <ol className="mt-3 space-y-2">
                  {visibleEntries.map((entry) => (
                    <LeaderboardRow
                      key={entry.profileId}
                      entry={entry}
                      showCentiseconds={detailedTimeEntries.includes(entry)}
                      isCurrentProfile={entry.profileId === currentProfileId}
                    />
                  ))}
                </ol>
              ) : (
                <div className="mt-3 space-y-3 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {playerResult
                      ? "Your score is saved on this device, but it has not reached the global board yet."
                      : "No global scores are available for this date yet."}
                  </p>
                  {playerResult ? (
                    <>
                      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-700 dark:bg-amber-950/40">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{profile.name} (you)</p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {playerResult.correctAnswers}/{playerResult.questionCount} correct ·{" "}
                          {formatDailyElapsedTime(playerResult.elapsedCentiseconds)}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setLoadedDateKey(null);
                          setSubmitRetryKey((key) => key + 1);
                        }}
                      >
                        Sync my score
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
            {visibleSnapshot ? (
              <div>
                <h3 className="font-display text-xl font-black">Questions included</h3>
                <ol className="mt-3 space-y-2">
                  {visibleSnapshot.questions.map((question, index) => (
                    <li
                      key={question.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Question {index + 1}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {formatQuestionType(question.mode)}
                      </p>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{question.prompt}</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        Answer: {question.correctAnswer}
                      </p>
                      {playerResult?.answers?.[index] ? (
                        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Your answer: {playerResult.answers[index].skipped ? "Skipped" : playerResult.answers[index].answer}
                          {" · "}
                          {playerResult.answers[index].correct ? "Correct" : "Incorrect"}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

