"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameActionButton } from "@/components/GameActionButton";
import { GameSetupPanel } from "@/components/GameSetupPanel";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import type { GameSetupDraft } from "@/lib/game-setup";
import {
  buildSettingsPatch,
  createSetupDraftFromProfile,
  getPlayablePoolForDraft,
} from "@/lib/game-setup";
import { getScopedModeInfo, normalizeScope, scopeQuery, scopeText, SCOPE_INFO } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import { clampRoundQuestionSetting, type GameMode, type SpeedRoundQuestionType } from "@/lib/types";

type GameModeSettingsPageContentProps = {
  mode: GameMode;
};

export function GameModeSettingsPageContent({ mode }: GameModeSettingsPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useProfiles();
  const profile = useRequiredProfile();
  const scope = normalizeScope(searchParams.get("scope"));
  const scopeInfo = SCOPE_INFO[scope];
  const modeInfo = getScopedModeInfo(mode, scope);

  const [draft, setDraft] = useState<GameSetupDraft>(() =>
    createSetupDraftFromProfile(profile, mode, scope),
  );
  const draftRef = useRef(draft);
  const [startBarPinned, setStartBarPinned] = useState(false);
  const [startBarHeight, setStartBarHeight] = useState(0);
  const startBarRef = useRef<HTMLDivElement>(null);
  const pageHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const main = document.getElementById("main-content");
    const header = pageHeaderRef.current;
    if (!main || !header) return;

    const updatePinned = () => {
      setStartBarPinned(header.getBoundingClientRect().bottom <= 0);
    };

    updatePinned();
    main.addEventListener("scroll", updatePinned, { passive: true });
    window.addEventListener("resize", updatePinned);
    return () => {
      main.removeEventListener("scroll", updatePinned);
      window.removeEventListener("resize", updatePinned);
    };
  }, [mode]);

  useEffect(() => {
    const bar = startBarRef.current;
    if (!bar) return;

    const updateHeight = () => setStartBarHeight(bar.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [startBarPinned, mode]);

  const persistCurrentDraft = () => {
    const current = draftRef.current;
    const poolSize = getPlayablePoolForDraft(profile, current, scope);
    const patch = buildSettingsPatch(current, scope, poolSize);
    updateProfileSettings(profile.id, patch);
    recordModeSelection(profile.id, current.mode);
    refresh();
  };

  useEffect(() => {
    return () => {
      persistCurrentDraft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save draft snapshot on unmount
  }, [profile.id, scope]);

  useEffect(() => {
    const handleBeforeUnload = () => persistCurrentDraft();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save draft snapshot on tab close
  }, [profile.id, scope]);

  const normalizedDraft =
    draft.mode === "daily-challenge"
      ? draft
      : {
          ...draft,
          roundQuestionCount: clampRoundQuestionSetting(
            draft.roundQuestionCount,
            getPlayablePoolForDraft(profile, draft, scope),
          ),
        };

  const availableCountryCount = getPlayablePoolForDraft(profile, normalizedDraft, scope);
  const weakSpotCodes =
    normalizedDraft.mode === "weak-spots"
      ? getCommonlyMissedCountries(profile, scope)
      : undefined;

  const setupBackHref = `/play/setup${scopeQuery(scope)}`;
  const isDailyChallenge = mode === "daily-challenge";
  const startDisabled =
    (mode === "weak-spots" && !weakSpotCodes?.length) ||
    (!isDailyChallenge && availableCountryCount === 0);

  const handleDone = () => {
    persistCurrentDraft();
    router.push("/");
  };

  const handlePlay = () => {
    if (startDisabled) return;
    persistCurrentDraft();
    router.push(`/play/${mode}${scopeQuery(scope)}?autostart=1`);
  };

  if (!modeInfo) {
    return (
      <div className="space-y-4">
        <p>Unknown game mode.</p>
        <Link href={setupBackHref} className="text-sm font-semibold text-teal-700 dark:text-teal-400">
          ← Back to modes
        </Link>
      </div>
    );
  }

  const startGameButton = (
    <div className="relative z-40">
      {startBarPinned ? <div style={{ height: startBarHeight }} aria-hidden /> : null}
      <div
        ref={startBarRef}
        className={
          startBarPinned
            ? "fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-40 sm:top-[calc(4rem+env(safe-area-inset-top,0px))]"
            : undefined
        }
      >
        <div
          className={
            startBarPinned
              ? "mx-auto w-full max-w-5xl px-[max(0.75rem,env(safe-area-inset-left,0px))] sm:px-4"
              : undefined
          }
        >
          <div
            className={
              startBarPinned
                ? "border-x-2 border-b-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                : undefined
            }
          >
            <div className="px-1 pb-1">
              <GameActionButton
                onClick={handlePlay}
                disabled={startDisabled}
                icon={scopeInfo.icon}
              >
                {isDailyChallenge ? "Start today's challenge" : "Start Game"}
              </GameActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-24 sm:space-y-6">
      <header ref={pageHeaderRef}>
        <Link
          href={setupBackHref}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
        >
          ← Back to modes
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="text-3xl" aria-hidden>
            {modeInfo.icon}
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {scopeText(modeInfo.title, scope)}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {scopeText(modeInfo.description, scope)}
            </p>
          </div>
        </div>
      </header>

      {startGameButton}

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          Settings
        </h2>
        <GameSetupPanel
          mode={normalizedDraft.mode}
          scope={scope}
          continents={normalizedDraft.continents}
          includeTerritories={normalizedDraft.includeTerritories}
          difficulty={normalizedDraft.difficulty}
          questionType={normalizedDraft.questionType}
          roundQuestionCount={normalizedDraft.roundQuestionCount}
          availableCountryCount={availableCountryCount}
          weakSpotWarning={normalizedDraft.mode === "weak-spots" && !weakSpotCodes?.length}
          onContinentsChange={(continents) => setDraft((current) => ({ ...current, continents }))}
          onIncludeTerritoriesChange={(includeTerritories) =>
            setDraft((current) => ({ ...current, includeTerritories }))
          }
          onDifficultyChange={(difficulty) => setDraft((current) => ({ ...current, difficulty }))}
          onQuestionTypeChange={(questionType: SpeedRoundQuestionType) =>
            setDraft((current) => ({ ...current, questionType }))
          }
          onRoundQuestionCountChange={(roundQuestionCount) =>
            setDraft((current) => ({ ...current, roundQuestionCount }))
          }
        />
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4 sm:static sm:px-0 sm:pb-0">
        <button
          type="button"
          onClick={handleDone}
          className="mx-auto flex min-h-11 w-full max-w-5xl items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 py-2.5 font-display text-sm font-extrabold text-slate-700 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:max-w-md"
        >
          Save & return home
        </button>
      </div>
    </div>
  );
}
