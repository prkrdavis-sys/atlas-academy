"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayModeSwitcher } from "@/components/PlayModeSwitcher";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { PROFILE_EMOJI } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { href: "/", label: "Play", icon: "🌎" },
  { href: "/extras", label: "Explore", icon: "🧭" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/profiles", label: "Profiles", icon: PROFILE_EMOJI },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const hideHeader = pathname.startsWith("/play/") && !pathname.startsWith("/play/setup");

  if (hideHeader) return null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:h-16">
          <Link
            href="/"
            className="font-display text-lg font-extrabold tracking-tight text-teal-800 transition-opacity active:opacity-60 dark:text-teal-300 sm:text-xl"
          >
            <span aria-hidden>🌍</span> Atlas Academy
          </Link>
          <div className="hidden flex-1 justify-center sm:flex">
            <PlayModeSwitcher />
          </div>
          <div className="ml-auto flex items-center sm:hidden">
            <ProfileSwitcher compact />
          </div>
          <div className="hidden items-center sm:flex">
            <ProfileSwitcher />
          </div>
        </div>
      </header>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(15_23_42_/_0.08)] backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-900/92 dark:shadow-[0_-8px_30px_rgb(0_0_0_/_0.3)] sm:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 px-3">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors active:bg-slate-100 dark:active:bg-slate-800",
                  active ? "text-teal-700 dark:text-teal-300" : "text-slate-500 dark:text-slate-400",
                )}
              >
                <span className="text-xl leading-none" aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-teal-600 dark:bg-teal-400" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
