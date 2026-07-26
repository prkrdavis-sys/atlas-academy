"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActiveGameRoute = pathname.startsWith("/play/") && !pathname.startsWith("/play/setup");
  const isHomeRoute = pathname === "/";

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
            : isHomeRoute
              ? // Exact viewport height under the header so the home hero can
                // pin its action panels to the bottom (above the mobile tab bar).
                "flex h-[calc(100dvh-var(--app-header-offset))] flex-col overflow-y-auto px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:pb-8 sm:pt-8"
              : "px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:py-8",
        )}
      >
        {children}
      </main>
    </div>
  );
}
