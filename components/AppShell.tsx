"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlayRoute = pathname.startsWith("/play/");

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main
        id="main-content"
        className={cn(
          "mx-auto w-full max-w-5xl",
          isPlayRoute
            ? "play-main h-dvh overflow-y-auto px-3 sm:px-4"
            : "px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:py-8",
        )}
      >
        {children}
      </main>
    </div>
  );
}
