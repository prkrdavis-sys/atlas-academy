"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfiles } from "@/components/ProfileProvider";
import { Button } from "@/components/ui/Button";
import { AVATAR_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { profiles, activeProfile, switchProfile, addProfile, hydrated } = useProfiles();
  const displayProfile = hydrated ? activeProfile : null;
  const inactiveProfiles = profiles.filter((profile) => profile.id !== activeProfile?.id);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleCreate() {
    if (!name.trim()) return;
    addProfile(name, color);
    setName("");
    setShowCreate(false);
    setOpen(false);
    router.push("/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={displayProfile ? `Switch profile. Current profile: ${displayProfile.name}` : "Choose a profile"}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600",
          compact ? "px-2" : "px-3",
        )}
      >
        <span
          className="h-7 w-7 shrink-0 rounded-full"
          style={{ backgroundColor: displayProfile?.avatarColor ?? "#94a3b8" }}
        />
        <span className={cn(compact && "sr-only")}>{displayProfile?.name ?? "No profile"}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
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

          {inactiveProfiles.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Profiles
              </p>
              {inactiveProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    switchProfile(profile.id);
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="h-8 w-8 rounded-full" style={{ backgroundColor: profile.avatarColor }} />
                  <span className="font-medium">{profile.name}</span>
                </button>
              ))}
            </div>
          )}

          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-1 min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              + Create profile
            </button>
          ) : (
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Create a profile
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Profile name"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      color === c ? "border-slate-800 dark:border-slate-200" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button size="sm" className="w-full" onClick={handleCreate}>
                Create profile
              </Button>
            </div>
          )}

          <Link
            href="/profiles"
            className="mt-1 flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            Manage profiles
          </Link>
        </div>
      )}
    </div>
  );
}
