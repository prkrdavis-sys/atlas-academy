"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createProfile,
  deleteProfile,
  loadState,
  setActiveProfile,
  upsertProfile,
} from "@/lib/storage";
import type { Profile } from "@/lib/types";

type ProfileContextValue = {
  profiles: Profile[];
  activeProfile: Profile | null;
  hydrated: boolean;
  refresh: () => void;
  addProfile: (name: string, color: string) => Profile;
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
    setState(loadState());
    setHydrated(true);
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

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeProfile,
      hydrated,
      refresh,
      addProfile: (name, color) => {
        const profile = createProfile(name, color);
        upsertProfile(profile);
        setState(loadState());
        return profile;
      },
      switchProfile: (id) => {
        setActiveProfile(id);
        setState(loadState());
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
