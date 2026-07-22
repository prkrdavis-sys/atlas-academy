"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { getFlagPath } from "@/lib/countries";
import { cn } from "@/lib/utils";

type FlagLightboxProps = {
  open: boolean;
  onClose: () => void;
  code: string;
  countryName: string;
};

export function FlagLightbox({ open, onClose, code, countryName }: FlagLightboxProps) {
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5 md:p-6">
      <button
        type="button"
        aria-label="Close flag viewer"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="flag-lightbox-title"
        className={cn(
          "relative z-10 flex w-full max-w-[min(100%,72rem)] flex-col overflow-hidden",
          "h-[min(92dvh,52rem)] rounded-[1.75rem] border-2 border-slate-200 bg-white shadow-[0_24px_60px_rgb(15_23_42_/_0.35)]",
          "dark:border-slate-700 dark:bg-slate-900",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
              Flag
            </p>
            <h2
              id="flag-lightbox-title"
              className="truncate font-display text-lg font-extrabold text-slate-900 dark:text-slate-50 sm:text-xl"
            >
              {countryName}
            </h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            aria-label="Exit flag viewer"
            className="min-h-10 shrink-0 gap-1.5 font-extrabold sm:px-4"
          >
            <span aria-hidden>←</span>
            <span>Exit</span>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-gradient-to-br from-sky-50 via-white to-teal-50 p-4 dark:from-slate-800 dark:via-slate-900 dark:to-teal-950/50 sm:p-6 md:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFlagPath(code)}
            alt={`Flag of ${countryName}`}
            className="max-h-full max-w-full object-contain"
            decoding="async"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
