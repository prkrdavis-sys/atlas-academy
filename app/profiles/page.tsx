"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  ProfileAvatar,
  ProfileAvatarDetails,
  ProfileAvatarFlag,
} from "@/components/ProfileAvatar";
import { ProfileAvatarPicker } from "@/components/ProfileAvatarPicker";
import { Button } from "@/components/ui/Button";
import { ProfileProgressInfoDialog } from "@/components/ProfileProgressInfoDialog";
import { useProfiles } from "@/components/ProfileProvider";
import { PROFILE_AVATARS } from "@/lib/profile-avatars";
import { exportProfile, importProfile } from "@/lib/storage";
import { PROFILE_EMOJI } from "@/lib/types";
import type { Profile, ProfileAvatarId, ProfileAvatarSelection } from "@/lib/types";

function getAvatarSelection(avatarId: ProfileAvatarId): ProfileAvatarSelection {
  return { type: "portrait", avatarId };
}

export default function ProfilesPage() {
  const router = useRouter();
  const { user, isGuest, signOut, exitGuest } = useAuth();
  const { profiles, activeProfile, hydrated, addProfile, switchProfile, removeProfile, updateProfile, refresh } =
    useProfiles();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<ProfileAvatarId>(PROFILE_AVATARS[0].id);
  const [profileToModify, setProfileToModify] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editAvatarId, setEditAvatarId] = useState<ProfileAvatarId>(PROFILE_AVATARS[0].id);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNewUser = hydrated && profiles.length === 0;
  const dialogOpen = Boolean(profileToModify || profileToDelete);
  const orderedProfiles = activeProfile
    ? [activeProfile, ...profiles.filter((profile) => profile.id !== activeProfile.id)]
    : profiles;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (profileToDelete) {
        setProfileToDelete(null);
        return;
      }
      setProfileToModify(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dialogOpen, profileToDelete]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addProfile(name, getAvatarSelection(avatarId));
    setName("");
    setAvatarId(PROFILE_AVATARS[0].id);
    setShowProgressInfo(true);
  }

  function dismissProgressInfo() {
    setShowProgressInfo(false);
    router.push("/");
  }

  function openModify(profile: Profile) {
    setProfileToModify(profile);
    setEditName(profile.name);
    setEditAvatarId(profile.avatarId ?? PROFILE_AVATARS[0].id);
  }

  function handleModifySave(e: React.FormEvent) {
    e.preventDefault();
    if (!profileToModify || !editName.trim()) return;
    updateProfile({
      ...profileToModify,
      name: editName.trim(),
      avatarColor: "",
      avatarId: editAvatarId,
    });
    setProfileToModify(null);
  }

  async function handleLogout() {
    setAccountError("");
    setLoggingOut(true);
    if (isGuest) {
      exitGuest();
      setLoggingOut(false);
      return;
    }
    const result = await signOut();
    setLoggingOut(false);
    if (result.error) {
      setAccountError(result.error);
    }
  }

  function handleExport(profile: Profile) {
    const data = exportProfile(profile.id);
    if (!data) return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name}-atlas-academy-profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        importProfile(reader.result);
        refresh();
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <ProfileProgressInfoDialog open={showProgressInfo} onClose={dismissProgressInfo} />
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Profiles</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
          {isNewUser
            ? "Create a player profile to save streaks, stats, and daily progress to your account."
            : "Create and switch between player profiles in this account."}
        </p>
      </div>

      {!hydrated ? (
        <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading profiles…</p>
        </div>
      ) : isNewUser ? (
        <form
          onSubmit={handleCreate}
          className="overflow-hidden rounded-[1.75rem] border-2 border-emerald-300 shadow-[0_16px_40px_rgb(15_118_110_/_0.18)] dark:border-emerald-700"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 px-4 py-5 sm:px-6 sm:py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-4 select-none text-[5.5rem] opacity-20 sm:-right-6 sm:-top-6 sm:text-[7rem]"
            >
              {PROFILE_EMOJI}
            </div>
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                  Get started
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Create a profile
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-emerald-50">
                  Pick a name and avatar — it only takes a few seconds.
                </p>
              </div>
              <Button type="submit" size="lg" className="shrink-0">
                Create profile
              </Button>
            </div>
          </div>
          <div className="space-y-5 bg-white/95 p-4 dark:bg-slate-900/95 sm:p-6">
            <div>
              <label htmlFor="create-profile-name" className="mb-1 block text-sm font-medium">
                Name
              </label>
              <input
                id="create-profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900 sm:text-sm"
                placeholder="Your name"
                autoFocus
              />
            </div>
            <ProfileAvatarPicker
              avatarId={avatarId}
              onAvatarChange={setAvatarId}
            />
          </div>
        </form>
      ) : (
        <>
          <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
            <h2 className="mb-4 font-semibold">Your profiles</h2>
            <div className="space-y-3">
              {orderedProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:bg-transparent sm:px-4 sm:py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <ProfileAvatar
                        avatarId={profile.avatarId}
                        avatarColor={profile.avatarColor}
                        size="lg"
                        alt=""
                      />
                      <ProfileAvatarFlag
                        avatarId={profile.avatarId}
                        alt={`Primary location flag for ${profile.name}'s portrait`}
                      />
                      <ProfileAvatarDetails avatarId={profile.avatarId} />
                    </div>
                    <div>
                      <p className="font-medium">{profile.name}</p>
                      {activeProfile?.id === profile.id && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Active</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 sm:mt-0">
                    {activeProfile?.id !== profile.id && (
                      <Button size="sm" onClick={() => switchProfile(profile.id)}>
                        Switch
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => openModify(profile)}>
                      Modify
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="px-3"
                      aria-label={`Delete ${profile.name}`}
                      title="Delete profile"
                      onClick={() => setProfileToDelete(profile)}
                    >
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M8.25 4.5A2.25 2.25 0 0 1 10.5 2.25h3A2.25 2.25 0 0 1 15.75 4.5v.75h3a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1 0-1.5h3V4.5Zm1.5.75h4.5V4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v.75ZM6.75 8.25h10.5l-.64 11.02A2.625 2.625 0 0 1 13.99 21.75H10a2.625 2.625 0 0 1-2.62-2.48L6.75 8.25Zm3.75 2.25a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 1.5 0v-6a.75.75 0 0 0-.75-.75Zm3.75.75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {isGuest ? "Account" : "Account username"}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {isGuest ? "Guest (this device only)" : (user?.email ?? "Unavailable")}
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? "Logging out…" : isGuest ? "Exit guest" : "Log out"}
                </Button>
              </div>
              {accountError && (
                <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                  {accountError}
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={handleCreate}
            className="overflow-hidden rounded-[1.75rem] border-2 border-emerald-200 bg-white/90 shadow-md backdrop-blur dark:border-emerald-800 dark:bg-slate-900/90"
          >
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-4 dark:border-emerald-900/50 dark:from-emerald-950/60 dark:to-teal-950/40 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-xl shadow-sm"
                  >
                    {PROFILE_EMOJI}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100 sm:text-xl">
                      Create a profile
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                      Add another player to this account.
                    </p>
                  </div>
                </div>
                <Button type="submit" className="shrink-0">
                  Create profile
                </Button>
              </div>
            </div>
            <div className="space-y-5 p-4 sm:p-6">
              <div>
                <label htmlFor="create-profile-name-existing" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  id="create-profile-name-existing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900 sm:text-sm"
                  placeholder="Your name"
                />
              </div>
              <ProfileAvatarPicker
                avatarId={avatarId}
                onAvatarChange={setAvatarId}
              />
            </div>
          </form>
        </>
      )}

      <details className="group rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/50 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900/40 sm:px-5 sm:py-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
          <span className="font-medium text-slate-600 dark:text-slate-300">Backup & restore</span>
          <span className="text-xs text-slate-500 dark:text-slate-500">Optional</span>
        </summary>
        <div className="mt-4 space-y-4 border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Save or move progress between devices. You don&apos;t need this to get started.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Import
              </p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Restore from a backup file</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="sr-only"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              Choose backup file
            </Button>
          </div>
          {profiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Export
              </p>
              <ul className="mt-2 space-y-1">
                {orderedProfiles.map((profile) => (
                  <li key={profile.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700 dark:text-slate-300">{profile.name}</span>
                    <button
                      type="button"
                      onClick={() => handleExport(profile)}
                      className="shrink-0 text-slate-500 underline-offset-2 hover:text-sky-700 hover:underline dark:text-slate-400 dark:hover:text-sky-400"
                    >
                      Download backup
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>

      {mounted &&
        profileToModify &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
            onClick={() => setProfileToModify(null)}
            role="presentation"
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="modify-profile-title"
              onSubmit={handleModifySave}
              onClick={(event) => event.stopPropagation()}
              className="animate-card-pop-in relative flex w-full max-w-sm max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] flex-col overflow-hidden rounded-[2rem] border-2 border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
            >
              <h3 id="modify-profile-title" className="shrink-0 font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                Modify profile
              </h3>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="modify-profile-name" className="mb-1 block text-sm font-medium">
                      Name
                    </label>
                    <input
                      id="modify-profile-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:text-sm"
                      placeholder="Your name"
                      autoFocus
                    />
                  </div>
                  <ProfileAvatarPicker
                    avatarId={editAvatarId}
                    onAvatarChange={setEditAvatarId}
                  />
                </div>
              </div>
              <div className="mt-6 grid shrink-0 grid-cols-2 gap-3">
                <Button type="button" variant="secondary" onClick={() => setProfileToModify(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!editName.trim()}>
                  Save
                </Button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {mounted &&
        profileToDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
            onClick={() => setProfileToDelete(null)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-profile-title"
              aria-describedby="delete-profile-description"
              onClick={(event) => event.stopPropagation()}
              className="animate-card-pop-in relative w-full max-w-sm rounded-[2rem] border-2 border-rose-100 bg-white p-5 shadow-2xl dark:border-rose-900 dark:bg-slate-900 sm:p-6"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.25 4.5A2.25 2.25 0 0 1 10.5 2.25h3A2.25 2.25 0 0 1 15.75 4.5v.75h3a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1 0-1.5h3V4.5Zm1.5.75h4.5V4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v.75ZM6.75 8.25h10.5l-.64 11.02A2.625 2.625 0 0 1 13.99 21.75H10a2.625 2.625 0 0 1-2.62-2.48L6.75 8.25Zm3.75 2.25a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 1.5 0v-6a.75.75 0 0 0-.75-.75Zm3.75.75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 id="delete-profile-title" className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  Delete profile?
                </h3>
                <p id="delete-profile-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  This will permanently delete <span className="font-bold text-slate-800 dark:text-slate-200">{profileToDelete.name}</span> and all saved progress.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" onClick={() => setProfileToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    removeProfile(profileToDelete.id);
                    setProfileToDelete(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
