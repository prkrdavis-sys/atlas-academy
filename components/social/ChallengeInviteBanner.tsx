"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useSocial } from "@/components/social/SocialProvider";
import { Button } from "@/components/ui/Button";
import { getScopedModeInfo } from "@/lib/scope";
import { respondToMatchInvite } from "@/lib/social/versus";
import type { MatchInvite } from "@/lib/social/types";
import { cn } from "@/lib/utils";

function inviteSummary(invite: MatchInvite): string {
  const info = getScopedModeInfo(invite.match.settings.mode, invite.match.settings.scope);
  const modeTitle = info?.title ?? "Mixed";
  return `${modeTitle} · ${invite.match.question_count} questions`;
}

/**
 * Pending head-to-head challenges pinned under the app header on the home page.
 * Friend requests stay in the Friends inbox; challenges surface here instead.
 */
export function ChallengeInviteBanner({ className }: { className?: string }) {
  const router = useRouter();
  const { enabled, invites, refresh } = useSocial();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!enabled || invites.length === 0) return null;

  async function handleInvite(matchId: string, accept: boolean) {
    setBusyId(matchId);
    try {
      await respondToMatchInvite(matchId, accept);
      if (accept) {
        router.push(`/play/versus/${matchId}`);
        return;
      }
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  return (
    <div
      role="region"
      aria-label="Challenge invites"
      className={cn(
        "sticky top-0 z-20 border-b border-sky-500/30 bg-sky-50/95 px-4 py-3 backdrop-blur-xl",
        "animate-card-pop-in dark:border-sky-400/25 dark:bg-sky-950/90",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-5xl flex-col gap-2">
        {invites.map((invite) => (
          <li
            key={invite.match.id}
            className="flex items-center gap-3 rounded-2xl border border-sky-500/35 bg-white/80 px-3 py-3 shadow-sm dark:border-sky-400/20 dark:bg-slate-900/70"
          >
            <ProfileAvatar
              avatarId={invite.player.avatar_id ?? undefined}
              avatarColor={invite.player.avatar_color}
              size="md"
              alt=""
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-extrabold text-slate-900 dark:text-white">
                {invite.player.display_name}
                <span className="font-bold text-sky-700 dark:text-sky-300"> challenged you</span>
              </span>
              <span className="block truncate text-[0.7rem] font-semibold text-slate-500 dark:text-slate-400">
                {inviteSummary(invite)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                disabled={busyId === invite.match.id}
                onClick={() => handleInvite(invite.match.id, true)}
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === invite.match.id}
                onClick={() => handleInvite(invite.match.id, false)}
              >
                Ignore
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
