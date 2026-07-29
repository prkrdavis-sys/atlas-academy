"use client";

import { useProfiles } from "@/components/ProfileProvider";
import { isHapticsEnabled, triggerHaptic } from "@/lib/haptics";
import { updateProfileSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** Vibration on/off toggle for the header menu, styled like SoundToggle. */
export function HapticsToggle() {
  const { activeProfile, refresh } = useProfiles();
  if (!activeProfile) return null;

  const enabled = isHapticsEnabled(activeProfile);

  function setEnabled(next: boolean) {
    if (!activeProfile) return;
    updateProfileSettings(activeProfile.id, { hapticsEnabled: next });
    refresh();
    if (next) {
      triggerHaptic("correct");
    }
  }

  return (
    <div className="px-3 py-2">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Vibration
      </p>
      <div
        className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        aria-label="Vibration"
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
          <span aria-hidden>📳</span>
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
          <span aria-hidden>📴</span>
          Off
        </button>
      </div>
    </div>
  );
}
