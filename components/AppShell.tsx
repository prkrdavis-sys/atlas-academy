"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { isMapRoute } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActiveGameRoute = pathname.startsWith("/play/") && !pathname.startsWith("/play/setup");
  // Home and map share one persistent globe page that slides between panes.
  const isGlobeExperienceRoute = pathname === "/" || isMapRoute(pathname);

  return (
    <div className="min-h-dvh">
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
        {children}
      </main>
    </div>
  );
}
