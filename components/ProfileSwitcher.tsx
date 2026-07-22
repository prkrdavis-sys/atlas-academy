"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfiles } from "@/components/ProfileProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { profiles, activeProfile, switchProfile, hydrated } = useProfiles();
  const displayProfile = hydrated ? activeProfile : null;
  const inactiveProfiles = profiles.filter((profile) => profile.id !== activeProfile?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={displayProfile ? `Open menu. Current profile: ${displayProfile.name}` : "Open menu"}
        className={cn(
          "flex min-h-11 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white text-sm shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600",
          compact ? "px-2.5 py-1.5" : "px-3 py-1.5",
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate font-display font-extrabold text-slate-800 dark:text-slate-100",
            compact ? "max-w-[5.5rem] text-xs" : "max-w-[9rem] text-sm",
          )}
        >
          {displayProfile?.name ?? "Menu"}
        </span>
        <span
          className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-800"
          style={{ backgroundColor: displayProfile?.avatarColor ?? "#94a3b8" }}
          aria-hidden
        />
        <svg
          aria-hidden
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            {displayProfile && (
              <div className="mb-1 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Active profile
                </p>
                <div className="mt-1 flex min-h-11 items-center gap-3 text-sm">
                  <span
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: displayProfile.avatarColor }}
                  />
                  <span className="font-medium">{displayProfile.name}</span>
                </div>
              </div>
            )}

            {!compact && (
              <Link
                href="/stats"
                role="menuitem"
                aria-current={pathname.startsWith("/stats") ? "page" : undefined}
                className={cn(
                  "mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                  pathname.startsWith("/stats")
                    ? "text-teal-700 dark:text-teal-300"
                    : "text-slate-700 dark:text-slate-200",
                )}
                onClick={closeMenu}
              >
                <span className="text-lg leading-none" aria-hidden>📊</span>
                Stats
              </Link>
            )}

            {inactiveProfiles.length > 0 && (
              <div>
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Switch profile
                </p>
                {inactiveProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      switchProfile(profile.id);
                      closeMenu();
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="h-8 w-8 rounded-full" style={{ backgroundColor: profile.avatarColor }} />
                    <span className="font-medium">{profile.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800">
            <ThemeToggle variant="menu" />
          </div>

          <div className="p-2">
            <Link
              href="/profiles"
              role="menuitem"
              className="flex min-h-11 w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              onClick={closeMenu}
            >
              Manage profiles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
