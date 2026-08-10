"use client";

import { useEffect, useState } from "react";
import StatsPage from "@/app/stats/page";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { SocialDialog } from "@/components/social/SocialDialog";
import { loadFriendStats } from "@/lib/social/friends";
import type { Friend, FriendStats } from "@/lib/social/types";

type FriendStatsDialogProps = {
  friend: Friend | null;
  onClose: () => void;
};

export function FriendStatsDialog({ friend, onClose }: FriendStatsDialogProps) {
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!friend) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStats(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setStats(null);
    setError(null);
    setLoading(true);

    void loadFriendStats(friend.player.id)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) setError("Those stats could not be loaded. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [friend]);

  const open = friend !== null;
  const displayName = friend?.player.display_name ?? "Friend";

  return (
    <SocialDialog
      open={open}
      onClose={onClose}
      icon="📊"
      eyebrow="Friend stats"
      title={displayName}
      className="max-w-4xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-extrabold text-white shadow-[0_3px_0_var(--color-teal-800)] transition-colors hover:bg-teal-700 active:translate-y-[2px] active:shadow-none"
        >
          Exit stats
        </button>
      }
    >
      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading {displayName}&apos;s stats…
          </p>
        </div>
      ) : error ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <p className="font-display text-base font-extrabold text-slate-900 dark:text-white">
            Stats unavailable
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      ) : stats ? (
        <div>
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3 dark:border-teal-800 dark:bg-teal-950/30">
            <ProfileAvatar
              avatarId={stats.player.avatar_id ?? undefined}
              avatarColor={stats.player.avatar_color}
              size="md"
              alt={`${displayName}'s avatar`}
            />
            <div>
              <p className="font-display text-sm font-extrabold text-slate-900 dark:text-white">
                Complete stats
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                World scope · shared with friends
              </p>
            </div>
          </div>
          <StatsPage
            profileOverride={stats.profile}
            showAdvancedLink={false}
            restoreStoredScope={false}
          />
        </div>
      ) : null}
    </SocialDialog>
  );
}
