"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useProfiles } from "@/components/ProfileProvider";
import { exportProfile, importProfile } from "@/lib/storage";
import { AVATAR_COLORS } from "@/lib/types";
import type { Profile } from "@/lib/types";

export default function ProfilesPage() {
  const { profiles, activeProfile, addProfile, switchProfile, removeProfile } = useProfiles();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addProfile(name, color);
    setName("");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") importProfile(reader.result);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Profiles</h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">Create and switch between local player profiles. No password needed.</p>
      </div>

      <form onSubmit={handleCreate} className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur sm:p-6">
        <h2 className="mb-4 font-semibold">Create a profile</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
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
                  className={`h-11 w-11 rounded-full border-2 ${color === c ? "border-slate-800 ring-2 ring-slate-300 ring-offset-2" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full sm:w-auto">Create</Button>
        </div>
      </form>

      <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur sm:p-6">
        <h2 className="mb-4 font-semibold">Your profiles</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-slate-600">No profiles yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:bg-transparent sm:px-4 sm:py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full" style={{ backgroundColor: profile.avatarColor }} />
                  <div>
                    <p className="font-medium">{profile.name}</p>
                    {activeProfile?.id === profile.id && (
                      <p className="text-xs text-emerald-600">Active</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
                  {activeProfile?.id !== profile.id && (
                    <Button
                      size="sm"
                      className="col-span-2 sm:col-span-1"
                      onClick={() => switchProfile(profile.id)}
                    >
                      Switch
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const data = exportProfile(profile.id);
                      if (!data) return;
                      const blob = new Blob([data], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${profile.name}-atlas-academy-profile.json`;
                      a.click();
                    }}
                  >
                    Export
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

      <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur sm:p-6">
        <h2 className="mb-2 font-semibold">Import profile</h2>
        <p className="mb-4 text-sm text-slate-600">Restore a profile from a backup JSON file.</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          className="sr-only"
        />
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => fileRef.current?.click()}>
          Choose backup file
        </Button>
      </div>

      {profileToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-profile-title"
            aria-describedby="delete-profile-description"
            className="animate-card-pop-in w-full max-w-sm rounded-[2rem] border-2 border-rose-100 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600">
              <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.25 4.5A2.25 2.25 0 0 1 10.5 2.25h3A2.25 2.25 0 0 1 15.75 4.5v.75h3a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1 0-1.5h3V4.5Zm1.5.75h4.5V4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v.75ZM6.75 8.25h10.5l-.64 11.02A2.625 2.625 0 0 1 13.99 21.75H10a2.625 2.625 0 0 1-2.62-2.48L6.75 8.25Zm3.75 2.25a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 1.5 0v-6a.75.75 0 0 0-.75-.75Zm3.75.75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 id="delete-profile-title" className="font-display text-2xl font-extrabold text-slate-900">
                Delete profile?
              </h3>
              <p id="delete-profile-description" className="mt-2 text-sm leading-6 text-slate-600">
                This will permanently delete <span className="font-bold text-slate-800">{profileToDelete.name}</span> and all saved progress.
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
