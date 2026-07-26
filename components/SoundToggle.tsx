"use client";

import { useProfiles } from "@/components/ProfileProvider";
import { isSoundEnabled, playSound } from "@/lib/sound";
import { updateProfileSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** Sound effects on/off toggle for the header menu, styled like ThemeToggle's menu variant. */
export function SoundToggle() {
  const { activeProfile, refresh } = useProfiles();
  if (!activeProfile) return null;

  const enabled = isSoundEnabled(activeProfile);

  function setEnabled(next: boolean) {
    if (!activeProfile) return;
    updateProfileSettings(activeProfile.id, { soundEnabled: next });
    refresh();
    if (next) playSound("tap");
  }

  return (
    <div className="px-3 py-2">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Sound effects
      </p>
      <div
        className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        aria-label="Sound effects"
      >
        <button
          type="button"
          onClick={() => setEnabled(true)}
          aria-pressed={enabled}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
            enabled
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <span aria-hidden>🔊</span>
          On
        </button>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          aria-pressed={!enabled}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
            !enabled
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <span aria-hidden>🔇</span>
          Off
        </button>
      </div>
    </div>
  );
}
