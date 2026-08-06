"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { PresenceActivity, PresenceEntry } from "@/lib/social/types";

const supabase = createClient();

/**
 * Single shared presence topic. Everyone tracks here and each client filters
 * down to its own friends; fine at this scale, shard by friend group if the
 * player base grows past a few thousand concurrent sessions.
 */
const LOBBY_TOPIC = "lobby";

type LobbyPresenceInput = {
  userId: string | null;
  displayName: string;
  avatarId: string | null;
  avatarColor: string;
  activity: PresenceActivity;
};

function toPresenceMap(channel: RealtimeChannel): Record<string, PresenceEntry> {
  const state = channel.presenceState<PresenceEntry>();
  const entries: Record<string, PresenceEntry> = {};

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      if (!presence.userId) continue;
      // A player may have several tabs open; an active round wins over idle.
      const existing = entries[presence.userId];
      if (!existing || existing.activity === "idle") {
        entries[presence.userId] = presence;
      }
    }
  }

  return entries;
}

export function useLobbyPresence({
  userId,
  displayName,
  avatarId,
  avatarColor,
  activity,
}: LobbyPresenceInput): Record<string, PresenceEntry> {
  const [presence, setPresence] = useState<Record<string, PresenceEntry>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(LOBBY_TOPIC, {
      config: { private: true, presence: { key: userId } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      setPresence(toPresenceMap(channel));
    });

    void channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void channel.track({
        userId,
        displayName,
        avatarId,
        avatarColor,
        activity,
      } satisfies PresenceEntry);
    });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // Identity fields are pushed by the effect below so re-tracking does not
    // tear down and rebuild the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !userId) return;
    if (channel.state !== "joined") return;

    void channel.track({
      userId,
      displayName,
      avatarId,
      avatarColor,
      activity,
    } satisfies PresenceEntry);
  }, [userId, displayName, avatarId, avatarColor, activity]);

  // Signed-out sessions have no lobby, so never surface a stale roster.
  return userId ? presence : EMPTY_PRESENCE;
}

const EMPTY_PRESENCE: Record<string, PresenceEntry> = {};

export function isOnline(entry: PresenceEntry | null | undefined): boolean {
  return entry != null;
}
