"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope } from "@/lib/types";

type MapProgressInfoDialogProps = {
  open: boolean;
  onClose: () => void;
  scope: GameScope;
};

export function MapProgressInfoDialog({ open, onClose, scope }: MapProgressInfoDialogProps) {
  const [mounted, setMounted] = useState(false);
  const scopeInfo = SCOPE_INFO[scope];
  const placeNoun = scopeInfo.noun.toLowerCase();

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
        aria-labelledby="map-progress-info-title"
        aria-describedby="map-progress-info-description"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem] border-2 border-teal-200 bg-white p-6 shadow-[0_24px_60px_rgb(15_23_42_/_0.35)] dark:border-teal-800 dark:bg-slate-900 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 text-[6rem] opacity-15"
        >
          {scopeInfo.icon}
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Map progress
        </p>
        <h2
          id="map-progress-info-title"
          className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
        >
          How to fill the map
        </h2>
        <p
          id="map-progress-info-description"
          className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
        >
          Answer correctly in <strong className="font-semibold text-slate-800 dark:text-slate-100">Normal</strong> or{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-100">Hard</strong> mode (not Practice) to fill
          each {placeNoun}. Master all four categories —{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-100">Flag</strong> (Countries from flags or
          Flags from countries),{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-100">Shape</strong>,{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-100">Capital</strong>, and{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-100">Trivia</strong> — to fully complete a{" "}
          {placeNoun}. Mixed, Daily Challenge, Marathon, and Speed Round count when the question matches a category.
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>,
    document.body,
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function MapProgressInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="How map progress works"
      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-teal-300/80 bg-white/80 text-teal-700 shadow-sm transition-colors hover:bg-white hover:text-teal-900 dark:border-teal-700 dark:bg-slate-900/80 dark:text-teal-300 dark:hover:bg-slate-900 dark:hover:text-teal-100"
    >
      <InfoIcon className="h-4 w-4" />
    </button>
  );
}
