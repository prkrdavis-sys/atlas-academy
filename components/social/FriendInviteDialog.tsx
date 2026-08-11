"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { SocialDialog } from "@/components/social/SocialDialog";
import { Button } from "@/components/ui/Button";
import { createFriendInvite } from "@/lib/social/friends";
import type { FriendInvite } from "@/lib/social/types";

type InviteState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; invite: FriendInvite; qrDataUrl: string }
  | { kind: "error"; message: string };

type ShareState = "idle" | "sharing" | "shared" | "copied" | "error";

type FriendInviteDialogProps = {
  open: boolean;
  onClose: () => void;
};

const SHARE_MESSAGE = "Join me on Atlas Academy! Add me as a friend:";

function formatExpiry(expiresAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(expiresAt));
}

export function FriendInviteDialog({ open, onClose }: FriendInviteDialogProps) {
  const [inviteState, setInviteState] = useState<InviteState>({ kind: "idle" });
  const [shareState, setShareState] = useState<ShareState>("idle");

  useEffect(() => {
    if (!open) {
      // The dialog owns a fresh invite each time it opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInviteState({ kind: "idle" });
      setShareState("idle");
      return;
    }

    let cancelled = false;
    setInviteState({ kind: "loading" });
    setShareState("idle");

    void createFriendInvite()
      .then(async (invite) => {
        const url = new URL(invite.url, window.location.origin).toString();
        const qrDataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 2,
          color: {
            dark: "#16803c",
            light: "#ffffff",
          },
          width: 320,
        });
        if (cancelled) return;
        setInviteState({
          kind: "ready",
          invite: { ...invite, url },
          qrDataUrl,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setInviteState({
            kind: "error",
            message: "Could not create your invite. Check your connection and try again.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function copyInvite(invite: FriendInvite): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(`${SHARE_MESSAGE} ${invite.url}`);
      return true;
    } catch {
      return false;
    }
  }

  async function handleShare() {
    if (inviteState.kind !== "ready" || shareState === "sharing") return;

    const { invite } = inviteState;
    setShareState("sharing");
    const shareData = {
      title: "Atlas Academy friend invite",
      text: SHARE_MESSAGE,
      url: invite.url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setShareState("shared");
        return;
      } catch {
        // Treat a dismissed or unavailable native sheet like an unsupported
        // browser and preserve a reliable copy fallback.
      }
    }

    setShareState((await copyInvite(invite)) ? "copied" : "error");
  }

  return (
    <SocialDialog
      open={open}
      onClose={onClose}
      icon="＋"
      eyebrow="Friend invite"
      title="Add Friend"
      className="max-w-md"
    >
      {inviteState.kind === "loading" ? (
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Preparing your invite…
          </p>
        </div>
      ) : inviteState.kind === "error" ? (
        <div className="space-y-4 py-6 text-center">
          <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {inviteState.message}
          </p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : inviteState.kind === "ready" ? (
        <div className="space-y-4">
          <div className="rounded-3xl bg-emerald-500/10 p-4 text-center dark:bg-emerald-400/10">
            <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-inner shadow-emerald-950/10">
              <Image
                src={inviteState.qrDataUrl}
                alt="QR code for your Atlas Academy friend invite"
                width={320}
                height={320}
                unoptimized
                className="size-[min(72vw,20rem)]"
              />
            </div>
            <p className="mt-4 text-sm font-bold text-emerald-900 dark:text-emerald-100">
              Scan this code to send you a friend request.
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-800/75 dark:text-emerald-200/75">
              This invite works until {formatExpiry(inviteState.invite.expiresAt)}.
            </p>
          </div>

          <Button type="button" size="lg" className="w-full" onClick={handleShare}>
            {shareState === "sharing" ? "Opening share menu…" : "Share link"}
          </Button>

          <p
            role="status"
            className="min-h-5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
          >
            {shareState === "shared"
              ? "Invite ready to send."
              : shareState === "copied"
                ? "Invite copied. Paste it into a message."
                : shareState === "error"
                  ? "Copy was unavailable. Select the link below to share it."
                  : "Messages, AirDrop, and other options appear when your device supports them."}
          </p>

          <label className="block">
            <span className="sr-only">Friend invite link</span>
            <input
              readOnly
              value={inviteState.invite.url}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-600 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 sm:text-sm"
            />
          </label>
        </div>
      ) : null}
    </SocialDialog>
  );
}
