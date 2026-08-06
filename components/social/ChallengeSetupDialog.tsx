"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PlacesSheet } from "@/components/setup/PlacesSheet";
import { SocialDialog } from "@/components/social/SocialDialog";
import { Button } from "@/components/ui/Button";
import { getPlayablePoolSize, getRegionsForScope } from "@/lib/countries";
import { getScopedModeInfo } from "@/lib/scope";
import { createMatch } from "@/lib/social/versus";
import type { Friend, MatchSettings } from "@/lib/social/types";
import {
  PLAY_MODES,
  getRoundQuestionOptions,
  type GameMode,
  type GameScope,
  type Region,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Head-to-head keeps the round short enough to hold both players' attention. */
const DEFAULT_QUESTION_COUNT = 10;

type ChallengeSetupDialogProps = {
  friend: Friend | null;
  scope: GameScope;
  onClose: () => void;
};

export function ChallengeSetupDialog({ friend, scope, onClose }: ChallengeSetupDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>("mixed");
  const [continents, setContinents] = useState<Region[]>(() => [...getRegionsForScope(scope)]);
  const [includeTerritories, setIncludeTerritories] = useState(false);
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poolSize = useMemo(
    () => getPlayablePoolSize({ continents, includeTerritories, mode, scope }),
    [continents, includeTerritories, mode, scope],
  );

  const countOptions = useMemo(() => {
    const options = getRoundQuestionOptions(poolSize).filter((count) => count <= 25);
    return options.length > 0 ? options : [5];
  }, [poolSize]);

  const effectiveCount = countOptions.includes(questionCount)
    ? questionCount
    : countOptions[countOptions.length - 1]!;

  async function handleSend() {
    if (!friend || sending) return;

    setSending(true);
    setError(null);
    try {
      const settings: MatchSettings = { mode, continents, includeTerritories, scope };
      const match = await createMatch(friend.player.id, settings, effectiveCount);
      onClose();
      router.push(`/play/versus/${match.id}`);
    } catch {
      setError("Could not send that challenge. Try again in a moment.");
      setSending(false);
    }
  }

  const placesLabel =
    continents.length === getRegionsForScope(scope).length
      ? "Everywhere"
      : continents.length === 0
        ? "Nothing selected"
        : continents.join(", ");

  return (
    <>
      <SocialDialog
        open={friend !== null}
        onClose={onClose}
        icon="⚔️"
        eyebrow="Head-to-head"
        title={friend ? `Challenge ${friend.player.display_name}` : "Challenge"}
        footer={
          <div className="flex flex-col gap-2">
            {error ? (
              <p role="status" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </p>
            ) : null}
            <Button
              size="lg"
              className="w-full"
              onClick={handleSend}
              disabled={sending || poolSize < effectiveCount}
            >
              {sending ? "Sending invite…" : "Send challenge"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {friend ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.05]">
              <ProfileAvatar
                avatarId={friend.player.avatar_id ?? undefined}
                avatarColor={friend.player.avatar_color}
                size="md"
                alt=""
              />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-extrabold text-slate-900 dark:text-white">
                  {friend.player.display_name}
                </p>
                <p className="text-[0.7rem] font-semibold text-slate-500 dark:text-slate-400">
                  Both players answer the same questions at Normal difficulty.
                </p>
              </div>
            </div>
          ) : null}

          <section>
            <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Mode
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PLAY_MODES.map((playMode) => {
                const info = getScopedModeInfo(playMode, scope);
                if (!info) return null;
                const selected = playMode === mode;
                return (
                  <button
                    key={playMode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMode(playMode)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
                    )}
                  >
                    <span aria-hidden className="text-lg">
                      {info.icon}
                    </span>
                    <span className="min-w-0 truncate font-display text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {info.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Places
            </h3>
            <button
              type="button"
              onClick={() => setPlacesOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <span aria-hidden className="text-lg">
                🌍
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {placesLabel}
                </span>
                <span className="block text-[0.7rem] font-semibold text-slate-500 dark:text-slate-400">
                  {poolSize} in the pool
                </span>
              </span>
              <span aria-hidden className="text-slate-400 dark:text-slate-500">
                ›
              </span>
            </button>
          </section>

          <section>
            <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Questions
            </h3>
            <div className="flex flex-wrap gap-2">
              {countOptions.map((count) => {
                const selected = count === effectiveCount;
                return (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setQuestionCount(count)}
                    className={cn(
                      "min-h-11 min-w-14 rounded-2xl border-2 px-4 font-display text-sm font-extrabold tabular-nums transition-colors",
                      selected
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600",
                    )}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </SocialDialog>

      <PlacesSheet
        open={placesOpen}
        onClose={() => setPlacesOpen(false)}
        scope={scope}
        selected={continents}
        includeTerritories={includeTerritories}
        poolSize={poolSize}
        onChange={(next) => {
          setContinents(next.continents);
          setIncludeTerritories(next.includeTerritories);
        }}
      />
    </>
  );
}
