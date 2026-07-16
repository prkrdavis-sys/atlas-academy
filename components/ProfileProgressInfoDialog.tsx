"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

const PROGRESS_TIPS = [
  "Stats and streaks save automatically on this device.",
  "App updates can sometimes reset or delete profiles and stats — it's the alpha life.",
  "Clearing browser data or switching browsers will reset it too.",
  "Use Backup & restore on Profiles to keep a copy safe.",
] as const;

type ProfileProgressInfoDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfileProgressInfoDialog({ open, onClose }: ProfileProgressInfoDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-progress-title"
        aria-describedby="profile-progress-description"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem] border-2 border-teal-200 bg-white p-6 shadow-[0_24px_60px_rgb(15_23_42_/_0.35)] dark:border-teal-800 dark:bg-slate-900 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 text-[6rem] opacity-15"
        >
          💾
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Playtester note
        </p>
        <h2
          id="profile-progress-title"
          className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
        >
          Your progress saves on this device
        </h2>
        <div id="profile-progress-description" className="mt-4 space-y-2.5">
          {PROGRESS_TIPS.map((tip) => (
            <div key={tip} className="flex gap-2.5 text-sm leading-snug text-slate-600 dark:text-slate-300">
              <span aria-hidden className="mt-0.5 shrink-0 font-bold text-teal-600 dark:text-teal-400">
                •
              </span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
        <Button size="lg" className="mt-6 w-full" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>,
    document.body,
  );
}
