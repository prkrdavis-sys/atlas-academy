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
import { useAuth } from "@/components/AuthProvider";
import {
  deleteCloudProfile,
  loadCloudProfiles,
  saveCloudProfiles,
  toCloudError,
  type CloudProfileRow,
} from "@/lib/cloud-profiles";
import { getMillisecondsUntilDailyReset } from "@/lib/game-engine";
import {
  PROFILE_STORAGE_CHANGE_EVENT,
  createProfile,
  deleteProfile,
  getStorageAccount,
  loadState,
  normalizeProfile,
  recordDailyLogin,
  saveState,
  setActiveProfile,
  setStorageAccount,
  upsertProfile,
} from "@/lib/storage";
import { mergeLocalBestGameScores } from "@/lib/stats-helpers";
import type { Profile, ProfileAvatarId, ProfileAvatarSelection } from "@/lib/types";

type ProfileContextValue = {
  profiles: Profile[];
  activeProfile: Profile | null;
  hydrated: boolean;
  syncError: string | null;
  refresh: () => void;
  addProfile: (name: string, selection: ProfileAvatarSelection) => Profile;
  switchProfile: (id: string) => void;
  removeProfile: (id: string) => void;
  updateProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

const EMPTY_STATE = { profiles: [] as Profile[], activeProfileId: null as string | null };
const SYNC_RETRY_BASE_MS = 2000;
const SYNC_RETRY_MAX_MS = 60_000;

function normalizeCloudProfile(row: CloudProfileRow): Profile | null {
  try {
    if (!row.profile_data || typeof row.profile_data !== "object") return null;
    const rawProfile = row.profile_data as Partial<Profile>;
    const profile = {
      ...rawProfile,
      id: row.id,
      name: row.name,
      avatarColor: row.avatar_color,
      avatarId: row.avatar_id ? (row.avatar_id as ProfileAvatarId) : undefined,
      createdAt: rawProfile.createdAt ?? row.created_at,
    } as Profile;
    return normalizeProfile(profile);
  } catch {
    return null;
  }
}

function getSyncErrorMessage(error: unknown) {
  return toCloudError(error).message;
}

function cloneProfiles(profiles: Profile[]) {
  return profiles.map((profile) => structuredClone(profile));
}

/** Keep local daily results that cloud sync has not caught up with yet. */
function mergeLocalDailyChallengeProgress(cloud: Profile, local: Profile | undefined): Profile {
  if (!local) return cloud;

  const mergedResults = {
    ...(cloud.dailyChallengeResults ?? {}),
  };
  for (const [dateKey, result] of Object.entries(local.dailyChallengeResults ?? {})) {
    if (!mergedResults[dateKey]) {
      mergedResults[dateKey] = result;
    }
  }

  const withDaily = {
    ...cloud,
    dailyChallengeResults: mergedResults,
    dailyChallengeCompletions: [
      ...new Set([
        ...(cloud.dailyChallengeCompletions ?? []),
        ...(local.dailyChallengeCompletions ?? []),
        ...Object.keys(mergedResults),
      ]),
    ],
    dailyChallengePlayedDates: [
      ...new Set([
        ...(cloud.dailyChallengePlayedDates ?? []),
        ...(local.dailyChallengePlayedDates ?? []),
      ]),
    ],
  };

  return mergeLocalBestGameScores(withDaily, local);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, session, hydrated: authHydrated } = useAuth();
  const [state, setState] = useState(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const remoteReadyRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const syncGenerationRef = useRef(0);
  const syncQueueRef = useRef(Promise.resolve());

  const enqueueSync = useCallback((profiles: Profile[], deletedProfileId?: string) => {
    const userId = userIdRef.current;
    if (!userId || !remoteReadyRef.current) return;

    const generation = syncGenerationRef.current;
    const profileSnapshot = cloneProfiles(profiles);
    syncQueueRef.current = syncQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (generation !== syncGenerationRef.current || userId !== userIdRef.current) return;
        if (deletedProfileId) {
          await deleteCloudProfile(userId, deletedProfileId);
        }
        await saveCloudProfiles(userId, profileSnapshot);
      })
      .then(
        () => {
          if (generation === syncGenerationRef.current && userId === userIdRef.current) {
            setSyncError(null);
          }
        },
        (error: unknown) => {
          if (generation === syncGenerationRef.current && userId === userIdRef.current) {
            setSyncError(getSyncErrorMessage(error));
          }
        },
      );
  }, []);

  useEffect(() => {
    if (!authHydrated) return;

    let cancelled = false;
    const nextUserId = user?.id ?? null;
    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    remoteReadyRef.current = false;
    userIdRef.current = nextUserId;
    // The auth session is an external source; reset profile hydration when it changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncError(null);
    setHydrated(false);

    const anonymousState =
      nextUserId && getStorageAccount() === null ? loadState() : null;
    setStorageAccount(nextUserId);

    if (!nextUserId) {
      // Guest / signed-out: progress lives in the anonymous localStorage key.
      setState(loadState());
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    const userId = nextUserId;
    const cachedState = loadState();
    setState(cachedState);

    async function hydrateFromCloud() {
      try {
        const rows = await loadCloudProfiles(userId);
        let profiles = rows
          .map(normalizeCloudProfile)
          .filter((profile): profile is Profile => profile !== null);

        if (rows.length === 0 && anonymousState?.profiles.length) {
          profiles = anonymousState.profiles;
          await saveCloudProfiles(userId, profiles);
        } else {
          const localById = new Map(
            [...(anonymousState?.profiles ?? []), ...cachedState.profiles].map((profile) => [
              profile.id,
              profile,
            ]),
          );
          profiles = profiles.map((profile) =>
            mergeLocalDailyChallengeProgress(profile, localById.get(profile.id)),
          );
        }

        if (cancelled) return;

        const activeProfileId =
          cachedState.activeProfileId && profiles.some((profile) => profile.id === cachedState.activeProfileId)
            ? cachedState.activeProfileId
            : profiles[0]?.id ?? null;
        const nextState = { profiles, activeProfileId };
        saveState(nextState, { notify: false });
        remoteReadyRef.current = true;
        setState(nextState);
        setHydrated(true);

        if (profiles.length) {
          void saveCloudProfiles(userId, profiles).catch(() => undefined);
        }

        if (activeProfileId) {
          setState(recordDailyLogin(activeProfileId).state);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        // Keep local cache usable and let the resume scheduler own the first push.
        setSyncError(getSyncErrorMessage(error));
        remoteReadyRef.current = true;
        setState(cachedState);
        setHydrated(true);
      }
    }

    void hydrateFromCloud();

    return () => {
      cancelled = true;
      remoteReadyRef.current = false;
    };
  }, [authHydrated, user?.id]);

  // Single resume policy: exponential backoff while syncError is sticky, plus
  // immediate retry on tab focus/visibility or access-token refresh.
  useEffect(() => {
    if (!authHydrated || !user?.id || !syncError || !session?.access_token) return;

    let cancelled = false;
    let attempt = 0;
    let timer: number | undefined;

    function retry() {
      if (cancelled || !userIdRef.current || !remoteReadyRef.current) return;
      enqueueSync(loadState().profiles);
    }

    function schedule(delayMs: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        retry();
        attempt += 1;
        schedule(Math.min(SYNC_RETRY_BASE_MS * 2 ** attempt, SYNC_RETRY_MAX_MS));
      }, delayMs);
    }

    function handleResume() {
      if (document.visibilityState !== "visible") return;
      attempt = 0;
      schedule(0);
    }

    schedule(0);
    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [authHydrated, enqueueSync, session?.access_token, syncError, user?.id]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === null ||
        event.key === "geography-game" ||
        event.key?.startsWith("atlas-academy")
      ) {
        setState(loadState());
      }
    }

    function handleLocalStateChange(event: Event) {
      const loaded = loadState();
      setState(loaded);
      const detail = (event as CustomEvent<{ deletedProfileId?: string }>).detail;
      enqueueSync(loaded.profiles, detail?.deletedProfileId);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(PROFILE_STORAGE_CHANGE_EVENT, handleLocalStateChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PROFILE_STORAGE_CHANGE_EVENT, handleLocalStateChange);
    };
  }, [enqueueSync]);

  const refresh = useCallback(() => {
    setState(loadState());
  }, []);

  const profiles = state.profiles;
  const activeProfileId = state.activeProfileId;

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  // If the app stays open across the EST day boundary, secure the new day's
  // login as soon as it starts. Re-arms itself because recording changes
  // lastDateKey, which re-runs this effect for the following day.
  const lastLoginDateKey = activeProfile?.loginStreak?.lastDateKey ?? null;
  useEffect(() => {
    if (!hydrated || !activeProfileId) return;
    const msUntilReset = getMillisecondsUntilDailyReset();
    if (msUntilReset <= 0) return;
    const timeout = window.setTimeout(() => {
      setState(recordDailyLogin(activeProfileId).state);
    }, msUntilReset + 1000);
    return () => window.clearTimeout(timeout);
  }, [hydrated, activeProfileId, lastLoginDateKey]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeProfile,
      hydrated,
      syncError,
      refresh,
      addProfile: (name, selection) => {
        const profile = createProfile(name, selection);
        upsertProfile(profile);
        setActiveProfile(profile.id);
        setState(recordDailyLogin(profile.id).state);
        return profile;
      },
      switchProfile: (id) => {
        setActiveProfile(id);
        setState(recordDailyLogin(id).state);
      },
      removeProfile: (id) => {
        deleteProfile(id);
        setState(loadState());
      },
      updateProfile: (profile) => {
        upsertProfile(profile);
        setState(loadState());
      },
    }),
    [profiles, activeProfile, hydrated, refresh, syncError],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles must be used within ProfileProvider");
  return ctx;
}

export function useRequiredProfile(): Profile {
  const { activeProfile, hydrated } = useProfiles();

  if (!hydrated || !activeProfile) {
    throw new Error("useRequiredProfile must be used within a profile-gated route");
  }

  return activeProfile;
}
