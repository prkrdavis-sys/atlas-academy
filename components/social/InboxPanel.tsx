"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useSocial } from "@/components/social/SocialProvider";
import { Button } from "@/components/ui/Button";
import { respondToFriendRequest } from "@/lib/social/friends";
import { respondToMatchInvite } from "@/lib/social/versus";
import { getScopedModeInfo } from "@/lib/scope";
import type { MatchInvite } from "@/lib/social/types";

function inviteSummary(invite: MatchInvite): string {
  const info = getScopedModeInfo(invite.match.settings.mode, invite.match.settings.scope);
  const modeTitle = info?.title ?? "Mixed";
  return `${modeTitle} · ${invite.match.question_count} questions`;
}

/**
 * Inbox contents shown inside the Friends dialog: pending friend requests and
 * head-to-head challenges.
 */
export function InboxPanel({ onAcceptedChallenge }: { onAcceptedChallenge?: () => void }) {
  const router = useRouter();
  const { requests, invites, refresh } = useSocial();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRequest(friendshipId: string, accept: boolean) {
    setBusyId(friendshipId);
    try {
      await respondToFriendRequest(friendshipId, accept);
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  async function handleInvite(matchId: string, accept: boolean) {
    setBusyId(matchId);
    try {
      await respondToMatchInvite(matchId, accept);
      if (accept) {
        onAcceptedChallenge?.();
        router.push(`/play/versus/${matchId}`);
        return;
      }
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  const isEmpty = requests.length === 0 && invites.length === 0;

  if (isEmpty) {
    return (
      <div className="py-8 text-center">
        <p aria-hidden className="text-4xl">
          ✨
        </p>
        <p className="mt-3 font-display text-base font-extrabold text-slate-900 dark:text-white">
          Nothing waiting
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Friend requests and head-to-head challenges will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {invites.length > 0 ? (
        <section>
          <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
            Challenges · {invites.length}
          </h3>
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.match.id}
                className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/[0.07] px-3 py-3"
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
                    Decline
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {requests.length > 0 ? (
        <section>
          <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Friend requests · {requests.length}
          </h3>
          <ul className="space-y-2">
            {requests.map((request) => (
              <li
                key={request.friendshipId}
                className="flex items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.05]"
              >
                <ProfileAvatar
                  avatarId={request.player.avatar_id ?? undefined}
                  avatarColor={request.player.avatar_color}
                  size="md"
                  alt=""
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-extrabold text-slate-900 dark:text-white">
                    {request.player.display_name}
                  </span>
                  <span className="block text-[0.7rem] font-semibold text-slate-500 dark:text-slate-400">
                    Wants to be friends
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    disabled={busyId === request.friendshipId}
                    onClick={() => handleRequest(request.friendshipId, true)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === request.friendshipId}
                    onClick={() => handleRequest(request.friendshipId, false)}
                  >
                    Ignore
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
