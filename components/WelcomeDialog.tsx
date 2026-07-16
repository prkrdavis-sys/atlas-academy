"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { hasSeenWelcome, markWelcomeSeen } from "@/lib/welcome";

const WELCOME_HIGHLIGHTS = [
  "Match flags, capitals, and country shapes from around the world.",
  "Build streaks, chase daily challenges, and beat your personal best.",
  "Create a local profile to save your streaks, stats, and daily progress on this device.",
] as const;

const WELCOME_COUNTDOWN_SECONDS = 5;

export function WelcomeDialog() {
  const pathname = usePathname();
  const isPlayRoute = pathname.startsWith("/play/");
  const [open, setOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WELCOME_COUNTDOWN_SECONDS);
  const canDismiss = secondsRemaining === 0;

  useEffect(() => {
    if (isPlayRoute) return;
    if (hasSeenWelcome()) return;
    setOpen(true);
  }, [isPlayRoute]);

  useEffect(() => {
    if (!open) return;

    setSecondsRemaining(WELCOME_COUNTDOWN_SECONDS);
    let remaining = WELCOME_COUNTDOWN_SECONDS;
    const interval = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        setSecondsRemaining(0);
        window.clearInterval(interval);
        return;
      }
      setSecondsRemaining(remaining);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [open]);

  const dismiss = useCallback(() => {
    if (!canDismiss) return;
    markWelcomeSeen();
    setOpen(false);
  }, [canDismiss]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && canDismiss) dismiss();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, dismiss, canDismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      {canDismiss ? (
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          onClick={dismiss}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
        className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border-2 border-teal-200 bg-white p-6 shadow-[0_24px_60px_rgb(15_23_42_/_0.35)] dark:border-teal-800 dark:bg-slate-900 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 text-[6rem] opacity-15"
        >
          🌍
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Welcome aboard!
        </p>
        <h2
          id="welcome-title"
          className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl"
        >
          Ready to explore the world?
        </h2>
        <p
          id="welcome-description"
          className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
        >
          <span className="font-bold text-teal-700 dark:text-teal-300">Welcome, Atlas Explorer!</span>
          {" "}
          You&apos;ve arrived at your destination for scholarly pursuits towards becoming an Expert
          of the Atlas.
        </p>
        <div className="mt-4 space-y-2.5">
          {WELCOME_HIGHLIGHTS.map((highlight) => (
            <div
              key={highlight}
              className="flex gap-2.5 text-sm leading-snug text-slate-600 dark:text-slate-300"
            >
              <span aria-hidden className="mt-0.5 shrink-0 font-bold text-teal-600 dark:text-teal-400">
                •
              </span>
              <p>{highlight}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 rounded-2xl border-2 border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p>
            <span className="font-bold">Heads up!</span>
            {" "}
            You&apos;re on the alpha build — I&apos;m still cooking, so things may shift, wobble,
            or surprise you. That includes profiles and stats: an update might reset or delete them.
          </p>
          <p>
            Thanks for being an early explorer. Grab a backup on Profiles if you want a safety net
            while you help shape what Atlas Academy becomes.
          </p>
        </div>
        <Button
          size="lg"
          className="mt-6 w-full"
          disabled={!canDismiss}
          onClick={dismiss}
          aria-label={canDismiss ? "Continue" : `Continue in ${secondsRemaining} seconds`}
        >
          {canDismiss ? "OK" : secondsRemaining}
        </Button>
      </div>
    </div>
  );
}
