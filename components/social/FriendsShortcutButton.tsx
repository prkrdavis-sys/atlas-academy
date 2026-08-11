"use client";

import { useState } from "react";
import { FriendsDialog } from "@/components/social/FriendsDialog";
import { SocialSignInPrompt } from "@/components/social/SocialSignInPrompt";
import { useSocial } from "@/components/social/SocialProvider";
import type { GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Home-grid tile that opens the friends list. Shares the shortcut styling with
 * its neighbours but carries a pending-request badge like the header inbox.
 */
export function FriendsShortcutButton({
  scope,
  className,
}: {
  scope: GameScope;
  className?: string;
}) {
  const { enabled, friends, inboxCount } = useSocial();
  const [open, setOpen] = useState(false);
  const onlineCount = friends.filter((friend) => friend.presence).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex min-h-[5.5rem] flex-col items-start justify-center gap-0.5 rounded-2xl border border-slate-900/10 bg-white/55 px-3.5 py-3.5 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-slate-900/25 hover:bg-white/80 active:translate-y-0 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-white/25 dark:hover:bg-white/12",
          className,
        )}
      >
        <span aria-hidden className="text-xl">
          👥
        </span>
        <span className="font-display text-sm font-extrabold text-slate-900 dark:text-white">
          Friends
        </span>
        <span className="text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
          {enabled
            ? onlineCount > 0
              ? `${onlineCount} online`
              : friends.length > 0
                ? `${friends.length} added`
                : "Add a friend"
            : "Challenge a friend"}
        </span>
        {enabled && inboxCount > 0 ? (
          <span
            aria-label={`${inboxCount} pending`}
            className="absolute right-2.5 top-2.5 flex min-w-[1.15rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-black leading-[1.15rem] text-white"
          >
            {inboxCount > 9 ? "9+" : inboxCount}
          </span>
        ) : null}
      </button>

      {enabled ? (
        <FriendsDialog open={open} onClose={() => setOpen(false)} scope={scope} />
      ) : (
        <SocialSignInPrompt open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
