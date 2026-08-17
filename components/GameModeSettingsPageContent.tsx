"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameActionButton } from "@/components/GameActionButton";
import { RoundSetupCard } from "@/components/RoundSetupCard";
import { MobileBottomDock } from "@/components/MobileBottomDock";
import { ScopeSelector } from "@/components/ScopeSelector";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import type { GameSetupDraft } from "@/lib/game-setup";
import {
  buildSettingsPatch,
  createSetupDraftFromProfile,
  getDifficultySummary,
  getPlacesSummary,
  getPlayablePoolForDraft,
  getRoundLengthSummary,
} from "@/lib/game-setup";
import {
  getScopedModeInfo,
  scopedHref,
  scopeQuery,
  scopeText,
  setStoredScope,
  SCOPE_INFO,
} from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { markFreshPlay } from "@/lib/game-resume";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import { useResolvedGameScope } from "@/lib/use-game-scope";
import {
  clampRoundQuestionSetting,
  type ChallengeModifier,
  type GameMode,
  type GameScope,
} from "@/lib/types";
import { subtleBackLinkClass } from "@/lib/utils";

type GameModeSettingsPageContentProps = {
  mode: GameMode;
};

export function GameModeSettingsPageContent({ mode }: GameModeSettingsPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { refresh } = useProfiles();
  const profile = useRequiredProfile();
  const scope = useResolvedGameScope();
  const scopeInfo = scope ? SCOPE_INFO[scope] : null;
  const modeInfo = scope ? getScopedModeInfo(mode, scope) : undefined;

  const [draft, setDraft] = useState<GameSetupDraft | null>(null);
  const draftRef = useRef<GameSetupDraft | null>(null);
  const [playVisible, setPlayVisible] = useState(true);
  const playRef = useRef<HTMLDivElement>(null);

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

  // The docked Play only appears once the main one is scrolled away, so there is
  // never more than one Play button on screen.
  useEffect(() => {
    const target = playRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPlayVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [mode, draft]);

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

  const handlePlay = () => {
    if (startDisabled) return;
    persistCurrentDraft();
    markFreshPlay(mode, scope);
    router.push(scopedHref(`/play/${mode}`, scope, { autostart: "1" }));
  };

  const handleScopeSelect = (next: GameScope) => {
    if (!scope || next === scope) return;
    persistCurrentDraft();
    setStoredScope(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "usa") {
      params.set("scope", "usa");
    } else {
      params.delete("scope");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  if (!modeInfo || !scopeInfo) {
    return (
      <div className="space-y-4">
        <p>Unknown game mode.</p>
        <Link
          href={`/play/setup${scopeQuery(scope)}`}
          className="text-sm font-semibold text-teal-700 dark:text-teal-400"
        >
          ← Back to modes
        </Link>
      </div>
    );
  }

  const playSummary = [
    getRoundLengthSummary(
      normalizedDraft.mode,
      normalizedDraft.roundQuestionCount,
      normalizedDraft.challengeModifier,
      availableCountryCount,
    ).value,
    getDifficultySummary(normalizedDraft.mode, normalizedDraft.difficulty).value,
    getPlacesSummary(
      normalizedDraft.continents,
      normalizedDraft.includeTerritories,
      scope,
      availableCountryCount,
    ).value,
  ].join("  ·  ");

  const playButton = (
    <GameActionButton
      onClick={handlePlay}
      disabled={startDisabled}
      icon={scopeInfo.icon}
      subtitle={startDisabled ? undefined : playSummary}
    >
      Play
    </GameActionButton>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <Link href={setupBackHref} className={subtleBackLinkClass}>
          ← Back to modes
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800"
            >
              {modeInfo.icon}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                {scopeText(modeInfo.title, scope)}
              </h1>
              <p className="text-xs leading-snug text-slate-600 dark:text-slate-400 sm:text-sm">
                {scopeText(modeInfo.description, scope)}
              </p>
            </div>
          </div>
          <ScopeSelector scope={scope} onSelect={handleScopeSelect} />
        </div>
      </header>

      <div ref={playRef}>{playButton}</div>

      <RoundSetupCard
        mode={normalizedDraft.mode}
        scope={scope}
        challengeModifier={normalizedDraft.challengeModifier}
        continents={normalizedDraft.continents}
        includeTerritories={normalizedDraft.includeTerritories}
        difficulty={normalizedDraft.difficulty}
        roundQuestionCount={normalizedDraft.roundQuestionCount}
        availableCountryCount={availableCountryCount}
        allowTerritories={mode !== "globe-hunt"}
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

      {playVisible ? null : (
        <MobileBottomDock
          className="z-30"
          barClassName="px-4 pb-[calc(4.25rem+env(safe-area-inset-bottom))]"
        >
          {playButton}
        </MobileBottomDock>
      )}
    </div>
  );
}
