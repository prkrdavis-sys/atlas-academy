"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isCloudEnabled } from "@/lib/cloud-availability";
import { isGuestModeEnabled, setGuestModeEnabled } from "@/lib/guest-mode";
import { createClient } from "@/lib/supabase/client";

type AuthActionResult = {
  error: string | null;
  needsConfirmation?: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  hydrated: boolean;
  isGuest: boolean;
  continueAsGuest: () => void;
  exitGuest: () => void;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const CLOUD_OFFLINE_ERROR = "Accounts are temporarily unavailable.";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function clearGuestMode() {
  setGuestModeEnabled(false);
}

function enterGuestMode() {
  setGuestModeEnabled(true);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(() => !isCloudEnabled());
  const [hydrated, setHydrated] = useState(() => !isCloudEnabled());

  useEffect(() => {
    let mounted = true;

    if (!isCloudEnabled()) {
      enterGuestMode();
      return;
    }

    const supabase = createClient();

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setUser(null);
        setSession(null);
        setIsGuest(isGuestModeEnabled());
      } else {
        const nextUser = data.session?.user ?? null;
        setSession(data.session);
        setUser(nextUser);
        if (nextUser) {
          clearGuestMode();
          setIsGuest(false);
        } else {
          setIsGuest(isGuestModeEnabled());
        }
      }
      setHydrated(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);
      if (nextUser) {
        clearGuestMode();
        setIsGuest(false);
      } else {
        setIsGuest(isGuestModeEnabled());
      }
      setHydrated(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = useCallback(() => {
    enterGuestMode();
    setIsGuest(true);
  }, []);

  const exitGuest = useCallback(() => {
    if (!isCloudEnabled()) {
      enterGuestMode();
      setIsGuest(true);
      return;
    }
    clearGuestMode();
    setIsGuest(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!isCloudEnabled()) return { error: CLOUD_OFFLINE_ERROR };

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (!error) {
      clearGuestMode();
      setIsGuest(false);
    }

    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!isCloudEnabled()) return { error: CLOUD_OFFLINE_ERROR };

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) return { error: error.message };
    if (data.session) {
      clearGuestMode();
      setIsGuest(false);
    }
    return {
      error: null,
      needsConfirmation: !data.session,
    };
  }, []);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!isCloudEnabled()) {
      enterGuestMode();
      setUser(null);
      setSession(null);
      setIsGuest(true);
      return { error: null };
    }

    clearGuestMode();
    setIsGuest(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    return { error: error ? getErrorMessage(error) : null };
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      hydrated,
      isGuest,
      continueAsGuest,
      exitGuest,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, hydrated, isGuest, continueAsGuest, exitGuest, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
