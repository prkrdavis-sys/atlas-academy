"use client";

import {
  ProfileAvatar,
  ProfileAvatarDetails,
  ProfileAvatarFlag,
} from "@/components/ProfileAvatar";
import { PROFILE_AVATARS, getProfileAvatar } from "@/lib/profile-avatars";
import type { ProfileAvatarId } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProfileAvatarPickerProps = {
  avatarId: ProfileAvatarId;
  onAvatarChange: (avatarId: ProfileAvatarId) => void;
};

export function ProfileAvatarPicker({
  avatarId,
  onAvatarChange,
}: ProfileAvatarPickerProps) {
  const selectedPortrait = getProfileAvatar(avatarId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ProfileAvatar
            avatarId={selectedPortrait?.id}
            size="xl"
            alt=""
          />
          <ProfileAvatarFlag avatarId={selectedPortrait?.id} alt="" />
          <ProfileAvatarDetails avatarId={selectedPortrait?.id} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Selected avatar
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">World portrait</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Choose a portrait below.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">World portraits</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {PROFILE_AVATARS.map((avatar) => {
            const selected = avatarId === avatar.id;
            const label = `Use ${avatar.culture} portrait from ${avatar.location}`;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => onAvatarChange(avatar.id)}
                aria-label={label}
                aria-pressed={selected}
                title={label}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 px-1.5 py-2 transition",
                  selected
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-800"
                    : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-600 dark:hover:bg-sky-950/30",
                )}
              >
                <ProfileAvatar avatarId={avatar.id} size="xl" alt="" />
                <ProfileAvatarFlag avatarId={avatar.id} alt="" />
                <ProfileAvatarDetails avatarId={avatar.id} />
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
