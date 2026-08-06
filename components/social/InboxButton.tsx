"use client";

import { useState } from "react";
import { InboxDialog } from "@/components/social/InboxDialog";
import { useSocial } from "@/components/social/SocialProvider";
import { cn } from "@/lib/utils";

/**
 * Header entry point for pending friend requests and match invites. Hidden for
 * guests and signed-out visitors, who have no social graph.
 */
export function InboxButton({ compact = false }: { compact?: boolean }) {
  const { enabled, inboxCount } = useSocial();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  const hasPending = inboxCount > 0;
  const label = hasPending
    ? `Inbox, ${inboxCount} pending ${inboxCount === 1 ? "item" : "items"}`
    : "Inbox";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={cn(
          "relative flex items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100",
          compact ? "size-9 text-lg" : "size-10 text-xl",
        )}
      >
        <span aria-hidden>📬</span>
        {hasPending ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex min-w-[1.15rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-black leading-[1.15rem] text-white ring-2 ring-white dark:ring-slate-900"
          >
            {inboxCount > 9 ? "9+" : inboxCount}
          </span>
        ) : null}
      </button>

      <InboxDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
