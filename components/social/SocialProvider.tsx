"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useProfiles } from "@/components/ProfileProvider";
import {
  loadFriendships,
  loadHeadToHeadRecords,
  loadOwnPlayer,
  loadPendingMatchInvites,
  loadPlayers,
  syncOwnPlayer,
} from "@/lib/social/friends";
import { useLobbyPresence } from "@/lib/social/presence";
import { createClient } from "@/lib/supabase/client";
import type {
  Friend,
  FriendRequest,
  HeadToHeadRecord,
  MatchInvite,
  MatchRow,
  PlayerRow,
  PresenceActivity,
} from "@/lib/social/types";

const supabase = createClient();

type SocialContextValue = {
  /** False for guests and signed-out visitors; every social surface hides. */
  enabled: boolean;
  ready: boolean;
  self: PlayerRow | null;
  friends: Friend[];
  requests: FriendRequest[];
  invites: MatchInvite[];
  /** Drives the red badge on the inbox button. */
  inboxCount: number;
  refresh: () => void;
};

const SocialContext = createContext<SocialContextValue | null>(null);

const EMPTY_FRIENDS: Friend[] = [];
const EMPTY_REQUESTS: FriendRequest[] = [];
const EMPTY_INVITES: MatchInvite[] = [];

function deriveActivity(pathname: string): PresenceActivity {
  if (pathname.startsWith("/play/versus/")) return "in-match";
  if (pathname.startsWith("/play/") && !pathname.startsWith("/play/setup")) return "in-round";
  return "idle";
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user, hydrated: authHydrated } = useAuth();
  const { activeProfile } = useProfiles();
  const pathname = usePathname();

  const [self, setSelf] = useState<PlayerRow | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerRow>>({});
  const [friendships, setFriendships] = useState<
    { id: string; otherId: string; status: string; incoming: boolean; createdAt: string }[]
  >([]);
  const [records, setRecords] = useState<HeadToHeadRecord[]>([]);
  const [pendingMatches, setPendingMatches] = useState<MatchRow[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const userId = user?.id ?? null;
  const enabled = authHydrated && userId !== null;

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;

    function clear() {
      setSelf(null);
      setPlayers({});
      setFriendships([]);
      setRecords([]);
      setPendingMatches([]);
      setReady(authHydrated);
    }

    async function load(currentUserId: string | null) {
      // Signing out (or dropping to guest) has to wipe the previous account's
      // graph before anything renders again.
      if (!currentUserId) {
        clear();
        return;
      }

      try {
        const [ownPlayer, rows, headToHead, invites] = await Promise.all([
          loadOwnPlayer(currentUserId),
          loadFriendships(),
          loadHeadToHeadRecords(),
          loadPendingMatchInvites(currentUserId),
        ]);
        if (cancelled) return;

        const relations = rows.map((row) => {
          const incoming = row.addressee_id === currentUserId;
          return {
            id: row.id,
            otherId: incoming ? row.requester_id : row.addressee_id,
            status: row.status,
            incoming,
            createdAt: row.created_at,
          };
        });

        const relatedIds = relations.map((relation) => relation.otherId);
        const inviteHostIds = invites.map((invite) => invite.host_id);
        const directory = await loadPlayers([
          ...new Set([...relatedIds, ...inviteHostIds]),
        ]);
        if (cancelled) return;

        setSelf(ownPlayer);
        setFriendships(relations);
        setRecords(headToHead);
        setPendingMatches(invites);
        setPlayers(Object.fromEntries(directory.map((row) => [row.id, row])));
      } catch {
        // Social features are additive: a failure here must not break the app.
        if (!cancelled) {
          setFriendships([]);
          setPendingMatches([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load(enabled ? userId : null);

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, authHydrated, refreshToken]);

  // Keep the public directory row aligned with the active profile so friends
  // always see the name and avatar this account is currently playing as.
  const syncedSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !userId || !self || !activeProfile) return;

    const displayName = activeProfile.name;
    const avatarId = activeProfile.avatarId ?? null;
    const avatarColor = activeProfile.avatarColor;
    const signature = `${userId}:${displayName}:${avatarId}:${avatarColor}`;

    if (syncedSignatureRef.current === signature) return;
    if (
      self.display_name === displayName &&
      self.avatar_id === avatarId &&
      self.avatar_color === avatarColor
    ) {
      syncedSignatureRef.current = signature;
      return;
    }

    syncedSignatureRef.current = signature;
    void syncOwnPlayer(userId, { displayName, avatarId, avatarColor })
      .then(() => {
        setSelf((current) =>
          current
            ? {
                ...current,
                display_name: displayName,
                avatar_id: avatarId,
                avatar_color: avatarColor,
              }
            : current,
        );
      })
      .catch(() => {
        syncedSignatureRef.current = null;
      });
  }, [enabled, userId, self, activeProfile]);

  // Live inbox: new requests and match invites arrive without a refetch.
  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase
      .channel(`social-inbox-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `guest_id=eq.${userId}` },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `host_id=eq.${userId}` },
        () => refresh(),
      );

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, userId, refresh]);

  const presence = useLobbyPresence({
    userId: enabled ? userId : null,
    displayName: activeProfile?.name ?? self?.display_name ?? "Explorer",
    avatarId: activeProfile?.avatarId ?? null,
    avatarColor: activeProfile?.avatarColor ?? "",
    activity: deriveActivity(pathname),
  });

  const friends = useMemo<Friend[]>(() => {
    if (!enabled) return EMPTY_FRIENDS;

    return friendships
      .filter((relation) => relation.status === "accepted")
      .map((relation): Friend | null => {
        const player = players[relation.otherId];
        if (!player) return null;
        return {
          friendshipId: relation.id,
          player,
          presence: presence[relation.otherId] ?? null,
          record: records.find((record) => record.opponent_id === relation.otherId) ?? null,
        };
      })
      .filter((friend): friend is Friend => friend !== null);
  }, [enabled, friendships, players, presence, records]);

  const requests = useMemo<FriendRequest[]>(() => {
    if (!enabled) return EMPTY_REQUESTS;

    return friendships
      .filter((relation) => relation.status === "pending" && relation.incoming)
      .map((relation): FriendRequest | null => {
        const player = players[relation.otherId];
        if (!player) return null;
        return {
          friendshipId: relation.id,
          player,
          createdAt: relation.createdAt,
        };
      })
      .filter((request): request is FriendRequest => request !== null);
  }, [enabled, friendships, players]);

  const invites = useMemo<MatchInvite[]>(() => {
    if (!enabled) return EMPTY_INVITES;

    return pendingMatches
      .map((match): MatchInvite | null => {
        const player = players[match.host_id];
        if (!player) return null;
        return { match, player };
      })
      .filter((invite): invite is MatchInvite => invite !== null);
  }, [enabled, pendingMatches, players]);

  const value = useMemo<SocialContextValue>(
    () => ({
      enabled,
      ready,
      self,
      friends,
      requests,
      invites,
      inboxCount: requests.length + invites.length,
      refresh,
    }),
    [enabled, ready, self, friends, requests, invites, refresh],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error("useSocial must be used within SocialProvider");
  return context;
}
