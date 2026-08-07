"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import { GlobeExperience } from "@/components/GlobeExperience";
import { useProfiles } from "@/components/ProfileProvider";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { isExploreRoute, isMapRoute } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isGuest, hydrated: authHydrated } = useAuth();
  const { syncError } = useProfiles();
  const isAuthRoute = pathname === "/auth";
  const isDevPreviewRoute = pathname.startsWith("/dev/");
  const isActiveGameRoute = pathname.startsWith("/play/") && !pathname.startsWith("/play/setup");
  // Home, map, and Library share one persistent globe page that slides between panes.
  const isGlobeExperienceRoute =
    pathname === "/" || isMapRoute(pathname) || isExploreRoute(pathname);
  const canAccessApp = Boolean(user) || isGuest;

  useEffect(() => {
    if (!authHydrated) return;
    if (!canAccessApp && !isAuthRoute && !isDevPreviewRoute) {
      router.replace("/auth");
    } else if (user && isAuthRoute) {
      router.replace("/");
    } else if (isGuest && isAuthRoute) {
      router.replace("/profiles");
    }
  }, [authHydrated, canAccessApp, isAuthRoute, isDevPreviewRoute, isGuest, router, user]);

  if (!authHydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-sm text-slate-300">
        Loading Atlas Academy…
      </main>
    );
  }

  if (isAuthRoute || isDevPreviewRoute) {
    return <main id="main-content">{children}</main>;
  }

  if (!canAccessApp) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-sm text-slate-300">
        Redirecting to sign in…
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      {syncError && (
        <div
          role="alert"
          className="fixed inset-x-3 top-3 z-[90] mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-xl dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-100"
        >
          <p className="font-bold">Cloud saving is temporarily unavailable.</p>
          <p className="mt-0.5">
            Your progress is still cached on this device and will retry on the next change or reload. {syncError}
          </p>
        </div>
      )}
      {!isActiveGameRoute && <WelcomeDialog />}
      <AppHeader />
      <main
        id="main-content"
        className={cn(
          "mx-auto w-full max-w-5xl",
          isActiveGameRoute
            ? "play-main h-dvh overflow-y-auto pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:px-4"
            : isGlobeExperienceRoute
              ? // Exact viewport height under the header; the globe experience
                // is full-bleed and each pane manages its own padding / scroll.
                // Main overflow stays locked so page scroll doesn't steal
                // vertical drags from the globe; the home pane scrolls itself.
                "flex h-[calc(100dvh-var(--app-header-offset))] flex-col overflow-hidden overscroll-none"
              : "px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:py-8",
        )}
      >
        {/* Keep the WebGL globe and its panes mounted across navigation. */}
        <Suspense fallback={null}>
          <GlobeExperience>{isExploreRoute(pathname) ? children : null}</GlobeExperience>
        </Suspense>
        {!isGlobeExperienceRoute ? children : null}
      </main>
    </div>
  );
}
