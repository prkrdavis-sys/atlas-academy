"use client";

import { useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PresenceDot, presenceLabel } from "@/components/social/PresenceDot";
import { Button } from "@/components/ui/Button";
import type { Friend } from "@/lib/social/types";

function recordLabel(friend: Friend): string | null {
  const record = friend.record;
  if (!record || record.played === 0) return null;
  return `${record.wins}W · ${record.losses}L${record.draws > 0 ? ` · ${record.draws}D` : ""}`;
}

type FriendRowProps = {
  friend: Friend;
  onViewStats: (friend: Friend) => void;
  onChallenge: (friend: Friend) => void;
  onRemove: (friend: Friend) => void;
};

export function FriendRow({ friend, onViewStats, onChallenge, onRemove }: FriendRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const activity = friend.presence?.activity ?? null;
  const online = activity !== null;
  const record = recordLabel(friend);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-900/10 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.05] sm:flex-row sm:items-center">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative shrink-0">
          <ProfileAvatar
            avatarId={friend.player.avatar_id ?? undefined}
            avatarColor={friend.player.avatar_color}
            size="md"
            alt={`${friend.player.display_name}'s avatar`}
          />
          <PresenceDot activity={activity} className="absolute -bottom-0.5 -right-0.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-extrabold text-slate-900 dark:text-white">
            {friend.player.display_name}
          </span>
          <span className="mt-0.5 block truncate text-[0.7rem] font-semibold text-slate-500 dark:text-slate-400">
            {presenceLabel(activity)}
            {record ? ` · ${record}` : ""}
          </span>
        </span>
      </span>

      {confirmingRemove ? (
        <span className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto">
          <Button
            variant="danger"
            size="sm"
            className="min-h-9 flex-1 sm:flex-none"
            onClick={() => {
              setConfirmingRemove(false);
              onRemove(friend);
            }}
          >
            Remove
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-9 flex-1 sm:flex-none"
            onClick={() => setConfirmingRemove(false)}
          >
            Cancel
          </Button>
        </span>
      ) : (
        <span className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            className="min-h-9 flex-1 sm:flex-none"
            onClick={() => onViewStats(friend)}
          >
            View stats
          </Button>
          {online ? (
            <Button
              size="sm"
              className="min-h-9 flex-1 sm:flex-none"
              onClick={() => onChallenge(friend)}
            >
              Challenge
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            aria-label={`Remove ${friend.player.display_name}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <span aria-hidden className="text-lg leading-none">
              ⋯
            </span>
          </button>
        </span>
      )}
    </li>
  );
}
