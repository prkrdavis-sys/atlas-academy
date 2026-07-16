"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProfileProgressInfoDialog } from "@/components/ProfileProgressInfoDialog";
import { useProfiles } from "@/components/ProfileProvider";
import { exportProfile, importProfile } from "@/lib/storage";
import { AVATAR_COLORS } from "@/lib/types";
import type { Profile } from "@/lib/types";

export default function ProfilesPage() {
  const router = useRouter();
  const { profiles, activeProfile, hydrated, addProfile, switchProfile, removeProfile, updateProfile, refresh } =
    useProfiles();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [profileToModify, setProfileToModify] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(AVATAR_COLORS[0]);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addProfile(name, color);
    setName("");
    setShowProgressInfo(true);
  }

  function dismissProgressInfo() {
    setShowProgressInfo(false);
    router.push("/");
  }

  function openModify(profile: Profile) {
    setProfileToModify(profile);
    setEditName(profile.name);
    setEditColor(profile.avatarColor);
  }

  function handleModifySave(e: React.FormEvent) {
    e.preventDefault();
    if (!profileToModify || !editName.trim()) return;
    updateProfile({
      ...profileToModify,
      name: editName.trim(),
      avatarColor: AVATAR_COLORS.includes(editColor as (typeof AVATAR_COLORS)[number])
        ? editColor
        : profileToModify.avatarColor,
    });
    setProfileToModify(null);
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
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">Create and switch between local player profiles. No password needed.</p>
      </div>

      <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
        <h2 className="mb-4 font-semibold">Your profiles</h2>
        {!hydrated ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading profiles…</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No profiles yet. Create one below.</p>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:bg-transparent sm:px-4 sm:py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full" style={{ backgroundColor: profile.avatarColor }} />
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
        )}
      </div>

      <form onSubmit={handleCreate} className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
        <h2 className="mb-4 font-semibold">Create a profile</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use profile color ${c}`}
                  className={`h-11 w-11 rounded-full border-2 ${color === c ? "border-slate-800 ring-2 ring-slate-300 ring-offset-2 dark:border-slate-200 dark:ring-slate-600 dark:ring-offset-slate-900" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full sm:w-auto">Create profile</Button>
        </div>
      </form>

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
                {profiles.map((profile) => (
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

      {profileToModify && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="modify-profile-title"
            onSubmit={handleModifySave}
            className="animate-card-pop-in w-full max-w-sm rounded-[2rem] border-2 border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
          >
            <h3 id="modify-profile-title" className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Modify profile
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="modify-profile-name" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  id="modify-profile-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Your name"
                  autoFocus
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Color</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      aria-label={`Use profile color ${c}`}
                      className={`h-11 w-11 rounded-full border-2 ${editColor === c ? "border-slate-800 ring-2 ring-slate-300 ring-offset-2 dark:border-slate-200 dark:ring-slate-600 dark:ring-offset-slate-900" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={() => setProfileToModify(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editName.trim()}>
                Save
              </Button>
            </div>
          </form>
        </div>
      )}

      {profileToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-profile-title"
            aria-describedby="delete-profile-description"
            className="animate-card-pop-in w-full max-w-sm rounded-[2rem] border-2 border-rose-100 bg-white p-5 shadow-2xl dark:border-rose-900 dark:bg-slate-900 sm:p-6"
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
        </div>
      )}
    </div>
  );
}
