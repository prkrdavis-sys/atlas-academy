"use client";

import { useState } from "react";
import { FriendInviteDialog } from "@/components/social/FriendInviteDialog";
import { useSocial } from "@/components/social/SocialProvider";
import { Button } from "@/components/ui/Button";
import {
  formatFriendCode,
  friendCodeInputIsCode,
  sendFriendRequestByCode,
  sendFriendRequestByEmail,
} from "@/lib/social/friends";

export function AddFriendForm() {
  const { self, refresh } = useSocial();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || status === "sending") return;

    setStatus("sending");
    try {
      if (friendCodeInputIsCode(trimmed)) {
        await sendFriendRequestByCode(trimmed);
      } else {
        await sendFriendRequestByEmail(trimmed);
      }
      setValue("");
      setStatus("sent");
      refresh();
    } catch {
      setStatus("error");
    }
  }

  async function handleCopyCode() {
    if (!self) return;
    try {
      await navigator.clipboard.writeText(self.friend_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="add-friend-input">
          Friend email address or friend code
        </label>
        <input
          id="add-friend-input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="Email address or friend code"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="min-h-11 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400 sm:text-sm"
        />
        <Button type="submit" disabled={!value.trim() || status === "sending"}>
          {status === "sending" ? "Sending…" : "Send request"}
        </Button>
      </form>

      {status === "sent" ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
        >
          Request sent. If that account exists, they will see it in their inbox.
        </p>
      ) : null}
      {status === "error" ? (
        <p
          role="status"
          className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-rose-200"
        >
          Could not send that request. Check your connection and try again.
        </p>
      ) : null}

      {self ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-900/15 px-3 py-2.5 dark:border-white/15">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Your friend code
            </p>
            <p className="font-mono text-sm font-bold tracking-widest text-slate-900 dark:text-white">
              {formatFriendCode(self.friend_code)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopyCode}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              className="border-2 border-emerald-300 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)] hover:bg-emerald-400"
              onClick={() => setInviteOpen(true)}
            >
              <span aria-hidden>＋</span>
              Add Friend
            </Button>
          </div>
        </div>
      ) : null}
      <FriendInviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
