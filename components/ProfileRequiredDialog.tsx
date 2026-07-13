"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

type ProfileRequiredDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfileRequiredDialog({ open, onClose }: ProfileRequiredDialogProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-required-title"
        aria-describedby="profile-required-description"
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border-2 border-teal-200 bg-white p-6 shadow-[0_24px_60px_rgb(15_23_42_/_0.35)] dark:border-teal-800 dark:bg-slate-900 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 text-[6rem] opacity-15"
        >
          🙂
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Before you play
        </p>
        <h2
          id="profile-required-title"
          className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
        >
          Create a profile to start playing
        </h2>
        <p
          id="profile-required-description"
          className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
        >
          Atlas Academy saves your streaks, stats, and daily challenge progress on this device.
          Pick a name and color to get started — it only takes a few seconds.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/profiles"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all duration-100 hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none"
          >
            Create a profile
          </Link>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
