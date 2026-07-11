"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProfiles } from "@/components/ProfileProvider";
import { Button } from "@/components/ui/Button";
import { AVATAR_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const { profiles, activeProfile, switchProfile, addProfile } = useProfiles();
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
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={activeProfile ? `Switch profile. Current profile: ${activeProfile.name}` : "Choose a profile"}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100",
          compact ? "px-2" : "px-3",
        )}
      >
        <span
          className="h-7 w-7 shrink-0 rounded-full"
          style={{ backgroundColor: activeProfile?.avatarColor ?? "#94a3b8" }}
        />
        <span className={cn(compact && "sr-only")}>{activeProfile?.name ?? "No profile"}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => {
                switchProfile(profile.id);
                setOpen(false);
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50",
                activeProfile?.id === profile.id && "bg-emerald-50",
              )}
            >
              <span className="h-8 w-8 rounded-full" style={{ backgroundColor: profile.avatarColor }} />
              <span className="font-medium">{profile.name}</span>
            </button>
          ))}

          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-1 min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
            >
              + Add profile
            </button>
          ) : (
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Profile name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      color === c ? "border-slate-800" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button size="sm" className="w-full" onClick={handleCreate}>
                Create
              </Button>
            </div>
          )}

          <Link
            href="/profiles"
            className="mt-1 flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Manage profiles
          </Link>
        </div>
      )}
    </div>
  );
}
