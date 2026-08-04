"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMillisecondsUntilDailyReset } from "@/lib/game-engine";
import {
  createProfile,
  deleteProfile,
  loadState,
  recordDailyLogin,
  setActiveProfile,
  upsertProfile,
} from "@/lib/storage";
import type { Profile, ProfileAvatarSelection } from "@/lib/types";

type ProfileContextValue = {
  profiles: Profile[];
  activeProfile: Profile | null;
  hydrated: boolean;
  refresh: () => void;
  addProfile: (name: string, selection: ProfileAvatarSelection) => Profile;
  switchProfile: (id: string) => void;
  removeProfile: (id: string) => void;
  updateProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

const EMPTY_STATE = { profiles: [] as Profile[], activeProfileId: null as string | null };

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  // Start with the same empty state on server and client, then hydrate from
  // localStorage after mount to avoid SSR/client markup mismatches.
  const [state, setState] = useState(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    // Hydrate from localStorage after mount (SSR renders the empty state).
    // Opening the app counts as the day's login for the active profile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loaded.activeProfileId ? recordDailyLogin(loaded.activeProfileId).state : loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === null || event.key === "atlas-academy" || event.key === "geography-game") {
        setState(loadState());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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
    [profiles, activeProfile, hydrated, refresh],
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
