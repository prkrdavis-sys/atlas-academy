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
  normalizeCloudProfile,
  saveCloudProfiles,
  toCloudError,
} from "@/lib/cloud-profiles";
import { getMillisecondsUntilDailyReset } from "@/lib/daily-calendar";
import {
  cloudProfilesNeedSave,
  mergeProfileLists,
} from "@/lib/profile-merge";
import {
  PROFILE_STORAGE_CHANGE_EVENT,
  createProfile,
  deleteProfile,
  getStorageAccount,
  loadState,
  recordDailyLogin,
  saveState,
  setActiveProfile,
  setStorageAccount,
  upsertProfile,
} from "@/lib/storage";
import type { Profile, ProfileAvatarSelection } from "@/lib/types";

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

function getSyncErrorMessage(error: unknown) {
  return toCloudError(error).message;
}

function cloneProfiles(profiles: Profile[]) {
  return profiles.map((profile) => structuredClone(profile));
}

function resolveActiveProfileId(profiles: Profile[], activeProfileId: string | null) {
  if (activeProfileId && profiles.some((profile) => profile.id === activeProfileId)) {
    return activeProfileId;
  }
  return profiles[0]?.id ?? null;
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
  const anonymousMigrateRef = useRef<Profile[] | null>(null);

  const applyMergedState = useCallback((profiles: Profile[], activeProfileId: string | null) => {
    const nextState = {
      profiles,
      activeProfileId: resolveActiveProfileId(profiles, activeProfileId),
    };
    saveState(nextState, { notify: false });
    setState(nextState);
    return nextState;
  }, []);

  const reconcileWithCloud = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;

    const rows = await loadCloudProfiles(userId);
    let cloudProfiles = rows
      .map(normalizeCloudProfile)
      .filter((profile): profile is Profile => profile !== null);

    const anonymousProfiles = anonymousMigrateRef.current;
    if (cloudProfiles.length === 0 && anonymousProfiles?.length) {
      cloudProfiles = cloneProfiles(anonymousProfiles);
      await saveCloudProfiles(userId, cloudProfiles);
      anonymousMigrateRef.current = null;
    }

    const localState = loadState();
    const merged = mergeProfileLists(localState.profiles, cloudProfiles);
    if (cloudProfilesNeedSave(merged, cloudProfiles)) {
      await saveCloudProfiles(userId, merged);
    }

    const latest = loadState();
    const applied = mergeProfileLists(latest.profiles, merged);
    if (cloudProfilesNeedSave(applied, latest.profiles)) {
      applyMergedState(applied, latest.activeProfileId);
    }
  }, [applyMergedState]);

  const enqueueReconcile = useCallback((deletedProfileId?: string) => {
    const userId = userIdRef.current;
    if (!userId || !remoteReadyRef.current) return;

    const generation = syncGenerationRef.current;
    syncQueueRef.current = syncQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (generation !== syncGenerationRef.current || userId !== userIdRef.current) return;
        if (deletedProfileId) {
          await deleteCloudProfile(userId, deletedProfileId);
        }
        await reconcileWithCloud();
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
  }, [reconcileWithCloud]);

  useEffect(() => {
    if (!authHydrated) return;

    let cancelled = false;
    const nextUserId = user?.id ?? null;
    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    remoteReadyRef.current = false;
    userIdRef.current = nextUserId;
    anonymousMigrateRef.current = null;
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

    const cachedState = loadState();
    setState(cachedState);
    anonymousMigrateRef.current = anonymousState?.profiles.length
      ? cloneProfiles(anonymousState.profiles)
      : null;

    async function hydrateFromCloud() {
      try {
        await reconcileWithCloud();
        if (cancelled || generation !== syncGenerationRef.current) return;

        remoteReadyRef.current = true;
        setHydrated(true);

        const activeProfileId = loadState().activeProfileId;
        if (activeProfileId) {
          setState(recordDailyLogin(activeProfileId).state);
        }
      } catch (error: unknown) {
        if (cancelled || generation !== syncGenerationRef.current) return;
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
  }, [authHydrated, reconcileWithCloud, user?.id]);

  // Pull cloud progress when this tab is focused again, and retry failed
  // syncs with backoff. A signed-in computer otherwise keeps a stale
  // localStorage snapshot until a full reload.
  useEffect(() => {
    if (!authHydrated || !user?.id || !session?.access_token) return;

    let cancelled = false;
    let attempt = 0;
    let timer: number | undefined;
    let lastResumeAt = 0;

    function retry() {
      if (cancelled || !userIdRef.current || !remoteReadyRef.current) return;
      enqueueReconcile();
    }

    function schedule(delayMs: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        retry();
        if (!syncError) return;
        attempt += 1;
        schedule(Math.min(SYNC_RETRY_BASE_MS * 2 ** attempt, SYNC_RETRY_MAX_MS));
      }, delayMs);
    }

    function handleResume() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!syncError && now - lastResumeAt < 1500) return;
      lastResumeAt = now;
      attempt = 0;
      schedule(0);
    }

    if (syncError) schedule(0);

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [authHydrated, enqueueReconcile, session?.access_token, syncError, user?.id]);

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
      enqueueReconcile(detail?.deletedProfileId);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(PROFILE_STORAGE_CHANGE_EVENT, handleLocalStateChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PROFILE_STORAGE_CHANGE_EVENT, handleLocalStateChange);
    };
  }, [enqueueReconcile]);

  const refresh = useCallback(() => {
    setState(loadState());
    enqueueReconcile();
  }, [enqueueReconcile]);

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
