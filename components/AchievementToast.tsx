"use client";

import { useEffect } from "react";
import { ACHIEVEMENTS } from "@/lib/types";

const DISPLAY_TIME_MS = 10_000;
const CONFETTI = [
  { left: "7%", delay: "0ms", color: "bg-amber-300", rotate: "-18deg" },
  { left: "17%", delay: "90ms", color: "bg-sky-400", rotate: "24deg" },
  { left: "29%", delay: "30ms", color: "bg-rose-400", rotate: "45deg" },
  { left: "41%", delay: "150ms", color: "bg-emerald-400", rotate: "-35deg" },
  { left: "56%", delay: "60ms", color: "bg-violet-400", rotate: "18deg" },
  { left: "68%", delay: "120ms", color: "bg-amber-400", rotate: "38deg" },
  { left: "81%", delay: "20ms", color: "bg-teal-400", rotate: "-28deg" },
  { left: "92%", delay: "170ms", color: "bg-pink-400", rotate: "32deg" },
] as const;

export function AchievementToast({
  achievementIds,
  onDismiss,
}: {
  achievementIds: string[];
  onDismiss: () => void;
}) {
  const achievementKey = achievementIds.join(",");
  const achievements = achievementIds
    .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id))
    .filter((achievement): achievement is (typeof ACHIEVEMENTS)[number] => Boolean(achievement));

  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = window.setTimeout(onDismiss, DISPLAY_TIME_MS);
    return () => window.clearTimeout(timer);
  }, [achievementKey, achievements.length, onDismiss]);

  if (achievements.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex justify-center sm:inset-x-6"
      role="status"
      aria-live="polite"
    >
      <div
        key={achievementKey}
        className="animate-achievement-toast relative w-full max-w-xl overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50/95 px-4 py-3 shadow-[0_16px_45px_rgb(120_53_15_/_0.28)] backdrop-blur-md dark:border-amber-500/70 dark:bg-slate-900/95 sm:px-5 sm:py-4"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-rose-400 to-sky-400" />
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              className={`animate-achievement-confetti absolute -top-3 h-3 w-1.5 rounded-sm ${piece.color}`}
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                rotate: piece.rotate,
              }}
            />
          ))}
        </div>

        <div className="relative flex items-start gap-3">
          <div
            className="animate-achievement-trophy flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-[0_5px_0_rgb(180_83_9)] sm:h-14 sm:w-14 sm:text-3xl"
            aria-hidden
          >
            🏆
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Achievement unlocked
            </p>
            <div className="mt-1 space-y-2">
              {achievements.map((achievement) => (
                <div key={achievement.id}>
                  <p className="font-display text-lg font-extrabold leading-tight text-slate-900 dark:text-slate-50 sm:text-xl">
                    {achievement.title}
                  </p>
                  <p className="mt-0.5 text-sm font-medium leading-snug text-slate-700 dark:text-slate-300">
                    {achievement.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
