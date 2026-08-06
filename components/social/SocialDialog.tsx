"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type SocialDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  icon: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Screen-centered modal shell shared by the friends list and the inbox, styled
 * to match the chunky bordered cards used elsewhere in the app.
 */
export function SocialDialog({
  open,
  onClose,
  title,
  eyebrow,
  icon,
  children,
  footer,
  className,
}: SocialDialogProps) {
  // Callers pass an inline onClose, so this must not be an effect dependency:
  // re-running would capture the already-hidden overflow as the value to
  // restore, leaving the page permanently unscrollable after closing.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[min(88dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border-2 border-teal-200 bg-white shadow-[0_24px_60px_rgb(15_23_42_/_0.35)] dark:border-teal-800 dark:bg-slate-900",
          className,
        )}
      >
        <header className="flex items-start gap-3 border-b border-slate-900/10 px-5 py-4 dark:border-white/10 sm:px-6">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-2xl dark:bg-teal-400/15"
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              {eyebrow}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>

        {footer ? (
          <footer className="border-t border-slate-900/10 px-5 py-4 dark:border-white/10 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
