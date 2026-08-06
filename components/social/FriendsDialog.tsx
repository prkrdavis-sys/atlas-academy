"use client";

import { useMemo, useState } from "react";
import { AddFriendForm } from "@/components/social/AddFriendForm";
import { ChallengeSetupDialog } from "@/components/social/ChallengeSetupDialog";
import { FriendRow } from "@/components/social/FriendRow";
import { SocialDialog } from "@/components/social/SocialDialog";
import { useSocial } from "@/components/social/SocialProvider";
import { removeFriend } from "@/lib/social/friends";
import type { Friend } from "@/lib/social/types";
import type { GameScope } from "@/lib/types";

/** Available friends sort first so there is always someone to play with up top. */
function partitionFriends(friends: Friend[]) {
  const online: Friend[] = [];
  const offline: Friend[] = [];

  for (const friend of friends) {
    if (friend.presence) online.push(friend);
    else offline.push(friend);
  }

  const byName = (a: Friend, b: Friend) =>
    a.player.display_name.localeCompare(b.player.display_name);

  return { online: online.sort(byName), offline: offline.sort(byName) };
}

type FriendsDialogProps = {
  open: boolean;
  onClose: () => void;
  scope: GameScope;
};

export function FriendsDialog({ open, onClose, scope }: FriendsDialogProps) {
  const { friends, ready, refresh } = useSocial();
  const [challenging, setChallenging] = useState<Friend | null>(null);

  const { online, offline } = useMemo(() => partitionFriends(friends), [friends]);

  async function handleRemove(friend: Friend) {
    try {
      await removeFriend(friend.friendshipId);
    } finally {
      refresh();
    }
  }

  return (
    <>
      <SocialDialog
        open={open}
        onClose={onClose}
        icon="🤝"
        eyebrow={`${friends.length} friend${friends.length === 1 ? "" : "s"}`}
        title="Friends"
        footer={<AddFriendForm />}
      >
        {!ready ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading your friends…
          </p>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center">
            <p aria-hidden className="text-4xl">
              🌍
            </p>
            <p className="mt-3 font-display text-base font-extrabold text-slate-900 dark:text-white">
              No friends yet
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Add someone with their email address or friend code below, then challenge them to a
              head-to-head round.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {online.length > 0 ? (
              <section>
                <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  Online · {online.length}
                </h3>
                <ul className="space-y-2">
                  {online.map((friend) => (
                    <FriendRow
                      key={friend.friendshipId}
                      friend={friend}
                      onChallenge={setChallenging}
                      onRemove={handleRemove}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {offline.length > 0 ? (
              <section>
                <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Offline · {offline.length}
                </h3>
                <ul className="space-y-2">
                  {offline.map((friend) => (
                    <FriendRow
                      key={friend.friendshipId}
                      friend={friend}
                      onChallenge={setChallenging}
                      onRemove={handleRemove}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </SocialDialog>

      <ChallengeSetupDialog
        friend={challenging}
        scope={scope}
        onClose={() => setChallenging(null)}
      />
    </>
  );
}
