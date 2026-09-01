"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { GlobeDayNightToggle } from "@/components/GlobeDayNightToggle";
import { GlobeUsModeToggle } from "@/components/GlobeUsModeToggle";
import { HapticsToggle } from "@/components/HapticsToggle";
import { LibraryBackgroundToggle } from "@/components/LibraryBackgroundToggle";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useProfiles } from "@/components/ProfileProvider";
import { ShowMapProgressToggle } from "@/components/ShowMapProgressToggle";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "@/components/CurrencySelector";
import { useCoachMarkAnchor } from "@/components/CoachMarkProvider";

const MENU_PANEL_CLASS =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900";
const MENU_PANEL_WIDTH = "w-[min(24rem,calc(100vw-2rem))]";

/**
 * The "main menu": the header profile dropdown that holds app-wide toggles
 * (appearance, sound, vibration, map progress, globe day/night, USA globe mode)
 * alongside profile switching and Library presentation preferences.
 */
type MenuPanelContentProps = {
  pathname: string;
  displayProfile: ReturnType<typeof useProfiles>["activeProfile"];
  inactiveProfiles: ReturnType<typeof useProfiles>["profiles"];
  hydrated: boolean;
  profiles: ReturnType<typeof useProfiles>["profiles"];
  onClose: () => void;
  onSwitchProfile: (profileId: string) => void;
};

function MenuPanelContent({
  pathname,
  displayProfile,
  inactiveProfiles,
  hydrated,
  profiles,
  onClose,
  onSwitchProfile,
}: MenuPanelContentProps) {
  return (
    <>
      <div className="border-b border-slate-100 p-2 dark:border-slate-800">
        <div className="rounded-xl bg-slate-50 p-1 dark:bg-slate-800/60">
          {displayProfile && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Active profile
              </p>
              <div className="mt-1 flex min-h-11 items-center gap-3 text-sm">
                <ProfileAvatar
                  avatarId={displayProfile.avatarId}
                  avatarColor={displayProfile.avatarColor}
                  size="md"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{displayProfile.name}</span>
                <Link
                  href="/stats"
                  role="menuitem"
                  aria-current={pathname.startsWith("/stats") ? "page" : undefined}
                  aria-label="Stats"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    pathname.startsWith("/stats")
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200"
                      : "bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700",
                  )}
                  onClick={onClose}
                >
                  <span className="text-sm leading-none" aria-hidden>
                    📊
                  </span>
                  Stats
                </Link>
              </div>
            </div>
          )}

          {!displayProfile && (
            <Link
              href="/stats"
              role="menuitem"
              aria-current={pathname.startsWith("/stats") ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/80 dark:hover:bg-slate-700/80",
                pathname.startsWith("/stats")
                  ? "text-teal-700 dark:text-teal-300"
                  : "text-slate-700 dark:text-slate-200",
              )}
              onClick={onClose}
            >
              <span className="text-lg leading-none" aria-hidden>
                📊
              </span>
              Stats
            </Link>
          )}

          {inactiveProfiles.length > 0 && (
            <div className="mt-1">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Switch profile
              </p>
              {inactiveProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSwitchProfile(profile.id);
                    onClose();
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/80 dark:hover:bg-slate-700/80"
                >
                  <ProfileAvatar
                    avatarId={profile.avatarId}
                    avatarColor={profile.avatarColor}
                    size="md"
                  />
                  <span className="font-medium">{profile.name}</span>
                </button>
              ))}
            </div>
          )}

          <Link
            href="/profiles"
            role="menuitem"
            className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            onClick={onClose}
          >
            {hydrated && profiles.length === 0 ? "Create profile" : "Manage profiles"}
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800">
        <div className="p-1">
          <ThemeToggle variant="menu" />
          <div className="grid grid-cols-2 gap-0.5">
            <SoundToggle />
            <HapticsToggle />
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            <ShowMapProgressToggle />
            <GlobeDayNightToggle />
          </div>
          <LibraryBackgroundToggle />
          <GlobeUsModeToggle />
        </div>
        <CurrencySelector />
      </div>
    </>
  );
}

export function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { profiles, activeProfile, switchProfile, hydrated } = useProfiles();
  const displayProfile = hydrated ? activeProfile : null;
  const inactiveProfiles = profiles.filter((profile) => profile.id !== activeProfile?.id);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useCoachMarkAnchor("profile-menu");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || !compact) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, compact]);

  useEffect(() => {
    if (!open || compact) return;

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open, compact]);

  function closeMenu() {
    setOpen(false);
  }

  const menuPanelContent = (
    <MenuPanelContent
      pathname={pathname}
      displayProfile={displayProfile}
      inactiveProfiles={inactiveProfiles}
      hydrated={hydrated}
      profiles={profiles}
      onClose={closeMenu}
      onSwitchProfile={switchProfile}
    />
  );

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
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
            compact ? "max-w-[5.5rem] text-xs" : "max-w-[4.5rem] text-sm lg:max-w-[9rem]",
          )}
        >
          {displayProfile?.name ?? "Menu"}
        </span>
        <ProfileAvatar
          avatarId={displayProfile?.avatarId}
          avatarColor={displayProfile?.avatarColor}
          size="sm"
          className="shrink-0 ring-2 ring-white dark:ring-slate-800"
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

      {open && compact && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[60] sm:hidden">
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-slate-950/40"
                onClick={closeMenu}
              />
              <div
                role="menu"
                className={cn(
                  MENU_PANEL_CLASS,
                  "absolute right-4 top-[calc(env(safe-area-inset-top)+3.75rem)] z-10 flex max-h-[calc(100dvh-env(safe-area-inset-top)-4.5rem-env(safe-area-inset-bottom)-0.75rem)] flex-col",
                  MENU_PANEL_WIDTH,
                )}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {menuPanelContent}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {open && !compact && (
        <div
          role="menu"
          className={cn(
            MENU_PANEL_CLASS,
            "absolute right-0 z-50 mt-2 max-h-[calc(100dvh-5rem)]",
            MENU_PANEL_WIDTH,
          )}
        >
          <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain">
            {menuPanelContent}
          </div>
        </div>
      )}
    </div>
  );
}
