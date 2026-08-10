"use client";

import { useMemo, useState } from "react";
import { AddFriendForm } from "@/components/social/AddFriendForm";
import { ChallengeSetupDialog } from "@/components/social/ChallengeSetupDialog";
import { FriendStatsDialog } from "@/components/social/FriendStatsDialog";
import { FriendRow } from "@/components/social/FriendRow";
import { InboxPanel } from "@/components/social/InboxPanel";
import { SocialDialog } from "@/components/social/SocialDialog";
import { useSocial } from "@/components/social/SocialProvider";
import { removeFriend } from "@/lib/social/friends";
import type { Friend } from "@/lib/social/types";
import type { GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type FriendsView = "friends" | "inbox";

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
  const { friends, ready, refresh, inboxCount } = useSocial();
  const [challenging, setChallenging] = useState<Friend | null>(null);
  const [viewingStats, setViewingStats] = useState<Friend | null>(null);
  const [view, setView] = useState<FriendsView>("friends");

  const { online, offline } = useMemo(() => partitionFriends(friends), [friends]);

  async function handleRemove(friend: Friend) {
    try {
      await removeFriend(friend.friendshipId);
    } finally {
      refresh();
    }
  }

  function handleClose() {
    setView("friends");
    onClose();
  }

  const showingInbox = view === "inbox";
  const hasPending = inboxCount > 0;

  return (
    <>
      <SocialDialog
        open={open}
        onClose={handleClose}
        icon={showingInbox ? "📬" : "🤝"}
        eyebrow={
          showingInbox
            ? hasPending
              ? `${inboxCount} pending`
              : "Inbox"
            : `${friends.length} friend${friends.length === 1 ? "" : "s"}`
        }
        title={showingInbox ? "Inbox" : "Friends"}
        headerAction={
          showingInbox ? (
            <button
              type="button"
              onClick={() => setView("friends")}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span aria-hidden>🤝</span>
              Friends
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView("inbox")}
              aria-label={
                hasPending
                  ? `Inbox, ${inboxCount} pending ${inboxCount === 1 ? "item" : "items"}`
                  : "Inbox"
              }
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-xl text-lg transition-colors",
                "text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100",
              )}
            >
              <span aria-hidden>📬</span>
              {hasPending ? (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 flex min-w-[1.05rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-black leading-[1.05rem] text-white ring-2 ring-white dark:ring-slate-900"
                >
                  {inboxCount > 9 ? "9+" : inboxCount}
                </span>
              ) : null}
            </button>
          )
        }
      >
        {showingInbox ? (
          <InboxPanel />
        ) : (
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 px-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Add a friend
              </h3>
              <AddFriendForm />
            </section>

            {!ready ? (
              <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                Loading your friends…
              </p>
            ) : friends.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-900/15 px-4 py-6 text-center dark:border-white/15">
                <p aria-hidden className="text-3xl">
                  ⚔️
                </p>
                <p className="mt-2 font-display text-sm font-extrabold text-slate-900 dark:text-white">
                  Challenge someone head-to-head
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Send a request with their email or friend code. When they accept and come online,
                  Challenge appears on their row.
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
                          onViewStats={setViewingStats}
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
                          onViewStats={setViewingStats}
                          onChallenge={setChallenging}
                          onRemove={handleRemove}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        )}
      </SocialDialog>

      <ChallengeSetupDialog
        friend={challenging}
        scope={scope}
        onClose={() => setChallenging(null)}
      />
      <FriendStatsDialog friend={viewingStats} onClose={() => setViewingStats(null)} />
    </>
  );
}
