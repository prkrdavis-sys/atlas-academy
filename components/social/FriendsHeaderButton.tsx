"use client";

import { useState } from "react";
import { FriendsDialog } from "@/components/social/FriendsDialog";
import { SocialSignInPrompt } from "@/components/social/SocialSignInPrompt";
import { useSocial } from "@/components/social/SocialProvider";
import { getStoredScope } from "@/lib/scope";
import { cn } from "@/lib/utils";

/**
 * Always-visible header entry for the friends list. Guests get the sign-up
 * prompt; signed-in players open the friends dialog.
 */
export function FriendsHeaderButton({ compact = false }: { compact?: boolean }) {
  const { enabled, friends, inboxCount } = useSocial();
  const [open, setOpen] = useState(false);
  const onlineCount = friends.filter((friend) => friend.presence).length;

  const label = enabled
    ? inboxCount > 0
      ? `Friends, ${inboxCount} pending`
      : onlineCount > 0
        ? `Friends, ${onlineCount} online`
        : friends.length > 0
          ? `Friends, ${friends.length} added`
          : "Friends"
    : "Friends";

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
        <span aria-hidden>👥</span>
        {enabled && inboxCount > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex min-w-[1.15rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-black leading-[1.15rem] text-white ring-2 ring-white dark:ring-slate-900"
          >
            {inboxCount > 9 ? "9+" : inboxCount}
          </span>
        ) : null}
      </button>

      {enabled ? (
        <FriendsDialog
          open={open}
          onClose={() => setOpen(false)}
          scope={getStoredScope()}
        />
      ) : (
        <SocialSignInPrompt open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
