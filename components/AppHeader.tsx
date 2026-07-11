"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { href: "/", label: "Play", icon: "🌎" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/profiles", label: "Profiles", icon: "🙂" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/play/")) return null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16">
          <Link
            href="/"
            className="font-display text-lg font-extrabold tracking-tight text-teal-800 transition-opacity active:opacity-60 sm:text-xl"
          >
            <span aria-hidden>🌍</span> Atlas Academy
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 sm:flex">
            <Link
              href="/"
              className={cn(
                "transition-colors hover:text-teal-700",
                pathname === "/" && "text-teal-700",
              )}
            >
              Play
            </Link>
            <Link
              href="/stats"
              className={cn(
                "transition-colors hover:text-teal-700",
                pathname === "/stats" && "text-teal-700",
              )}
            >
              Stats
            </Link>
            <ProfileSwitcher />
          </nav>
          <div className="sm:hidden">
            <ProfileSwitcher compact />
          </div>
        </div>
      </header>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(15_23_42_/_0.08)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 px-3">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors active:bg-slate-100",
                  active ? "text-teal-700" : "text-slate-500",
                )}
              >
                <span className="text-xl leading-none" aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-teal-600" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
