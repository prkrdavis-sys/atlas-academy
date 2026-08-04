"use client";

import { ProfileAvatar, ProfileAvatarFlag } from "@/components/ProfileAvatar";
import { PROFILE_AVATARS, getProfileAvatar } from "@/lib/profile-avatars";
import { AVATAR_COLORS, type ProfileAvatarId } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProfileAvatarPickerProps = {
  color: string;
  avatarId: ProfileAvatarId | null;
  onColorChange: (color: string) => void;
  onAvatarChange: (avatarId: ProfileAvatarId) => void;
};

export function ProfileAvatarPicker({
  color,
  avatarId,
  onColorChange,
  onAvatarChange,
}: ProfileAvatarPickerProps) {
  const selectedPortrait = getProfileAvatar(avatarId ?? undefined);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ProfileAvatar
            avatarId={selectedPortrait?.id}
            avatarColor={avatarId ? undefined : color}
            size="xl"
            alt=""
          />
          <ProfileAvatarFlag avatarId={selectedPortrait?.id} alt="" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Selected avatar
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {selectedPortrait ? "World portrait" : "Color avatar"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Choose a color or one of the portraits below.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((avatarColor) => {
            const selected = !avatarId && color === avatarColor;
            return (
              <button
                key={avatarColor}
                type="button"
                onClick={() => onColorChange(avatarColor)}
                aria-label={`Use profile color ${avatarColor}`}
                aria-pressed={selected}
                className={cn(
                  "h-11 w-11 rounded-full border-2 transition",
                  selected
                    ? "border-slate-800 ring-2 ring-slate-300 ring-offset-2 dark:border-slate-200 dark:ring-slate-600 dark:ring-offset-slate-900"
                    : "border-transparent hover:ring-2 hover:ring-slate-300 hover:ring-offset-2 dark:hover:ring-slate-600",
                )}
                style={{ backgroundColor: avatarColor }}
              />
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">World portraits</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
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
                <ProfileAvatar avatarId={avatar.id} size="lg" alt="" />
                <ProfileAvatarFlag avatarId={avatar.id} alt="" />
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
