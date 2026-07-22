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
import { getScopedModeInfo, scopeQuery, scopeText, SCOPE_INFO } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import { useResolvedGameScope } from "@/lib/use-game-scope";
import { clampRoundQuestionSetting, type ChallengeModifier, type GameMode } from "@/lib/types";
import { subtleBackLinkClass } from "@/lib/utils";

type GameModeSettingsPageContentProps = {
  mode: GameMode;
};

export function GameModeSettingsPageContent({ mode }: GameModeSettingsPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useProfiles();
  const profile = useRequiredProfile();
  const scope = useResolvedGameScope();
  const scopeInfo = scope ? SCOPE_INFO[scope] : null;
  const modeInfo = scope ? getScopedModeInfo(mode, scope) : undefined;

  const [draft, setDraft] = useState<GameSetupDraft | null>(null);
  const draftRef = useRef<GameSetupDraft | null>(null);
  const [startBarPinned, setStartBarPinned] = useState(false);
  const [startBarHeight, setStartBarHeight] = useState(0);
  const startBarRef = useRef<HTMLDivElement>(null);
  const pageHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scope) return;
    const initial = createSetupDraftFromProfile(profile, mode, scope);
    const modifierParam = searchParams.get("modifier");
    const nextDraft: GameSetupDraft =
      modifierParam === "speed-round" || modifierParam === "marathon"
        ? { ...initial, challengeModifier: modifierParam }
        : initial;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(nextDraft);
  }, [profile, mode, scope, searchParams]);

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
    if (!current || !scope) return;
    const poolSize = getPlayablePoolForDraft(profile, current, scope);
    const patch = buildSettingsPatch(current, scope, poolSize);
    updateProfileSettings(profile.id, patch);
    recordModeSelection(profile.id, current.mode);
    refresh();
  };

  useEffect(() => {
    if (!scope) return;
    return () => {
      persistCurrentDraft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save draft snapshot on unmount
  }, [profile.id, scope]);

  useEffect(() => {
    if (!scope) return;
    const handleBeforeUnload = () => persistCurrentDraft();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save draft snapshot on tab close
  }, [profile.id, scope]);

  if (!scope || !draft) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading settings…</p>
      </div>
    );
  }

  const normalizedDraft = {
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
  const startDisabled =
    (mode === "weak-spots" && !weakSpotCodes?.length) || availableCountryCount === 0;

  const handleDone = () => {
    persistCurrentDraft();
    router.push("/");
  };

  const handlePlay = () => {
    if (startDisabled) return;
    persistCurrentDraft();
    router.push(`/play/${mode}${scopeQuery(scope)}?autostart=1`);
  };

  if (!modeInfo || !scopeInfo) {
    return (
      <div className="space-y-4">
        <p>Unknown game mode.</p>
        <Link href={`/play/setup${scopeQuery(scope)}`} className="text-sm font-semibold text-teal-700 dark:text-teal-400">
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
              <GameActionButton onClick={handlePlay} disabled={startDisabled} icon={scopeInfo.icon}>
                Start Game
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
          className={subtleBackLinkClass}
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
          challengeModifier={normalizedDraft.challengeModifier}
          continents={normalizedDraft.continents}
          includeTerritories={normalizedDraft.includeTerritories}
          difficulty={normalizedDraft.difficulty}
          roundQuestionCount={normalizedDraft.roundQuestionCount}
          availableCountryCount={availableCountryCount}
          weakSpotWarning={normalizedDraft.mode === "weak-spots" && !weakSpotCodes?.length}
          onChallengeModifierChange={(challengeModifier: ChallengeModifier) =>
            setDraft((current) => (current ? { ...current, challengeModifier } : current))
          }
          onContinentsChange={(continents) =>
            setDraft((current) => (current ? { ...current, continents } : current))
          }
          onIncludeTerritoriesChange={(includeTerritories) =>
            setDraft((current) => (current ? { ...current, includeTerritories } : current))
          }
          onDifficultyChange={(difficulty) =>
            setDraft((current) => (current ? { ...current, difficulty } : current))
          }
          onRoundQuestionCountChange={(roundQuestionCount) =>
            setDraft((current) => (current ? { ...current, roundQuestionCount } : current))
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
