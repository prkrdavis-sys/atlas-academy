"use client";

import Link from "next/link";
import { SocialDialog } from "@/components/social/SocialDialog";
import { Button } from "@/components/ui/Button";

/**
 * Friends live on the account, not the local profile, so guests have to sign up
 * before any of it can work.
 */
export function SocialSignInPrompt({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <SocialDialog
      open={open}
      onClose={onClose}
      icon="👥"
      eyebrow="Friends"
      title="Create an account to play with friends"
    >
      <div className="space-y-4 py-2">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Friends are tied to your account so they can find you by email and challenge you to
          head-to-head rounds. Guest progress stays on this device only.
        </p>
        <ul className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <li className="flex items-center gap-2">
            <span aria-hidden>📬</span> Send and receive friend requests
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden>⚔️</span> Race a friend through the same questions
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden>☁️</span> Keep your progress backed up
          </li>
        </ul>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all duration-100 hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none"
          >
            Create an account
          </Link>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </SocialDialog>
  );
}
