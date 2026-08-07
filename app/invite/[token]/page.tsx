"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  previewFriendInvite,
  redeemFriendInvite,
} from "@/lib/social/friends";
import type {
  FriendInvitePreview,
  FriendInviteRedemption,
} from "@/lib/social/types";

type PreviewState =
  | { kind: "loading" }
  | { kind: "ready"; invite: FriendInvitePreview }
  | { kind: "error"; message: string };

type RedemptionState =
  | { kind: "idle" }
  | { kind: "redeeming" }
  | { kind: "complete"; status: FriendInviteRedemption }
  | { kind: "error"; message: string };

function getInviteMessage(
  status: FriendInviteRedemption,
  inviterName: string,
): string {
  switch (status) {
    case "sent":
      return `Your friend request was sent to ${inviterName}.`;
    case "accepted":
      return `You and ${inviterName} are now friends.`;
    case "already_friends":
      return `You and ${inviterName} are already friends.`;
    case "self":
      return "You cannot use your own friend invite.";
    case "expired":
      return "This friend invite has expired.";
    case "invalid":
      return "This friend invite is no longer valid.";
    default: {
      const exhaustiveStatus: never = status;
      return exhaustiveStatus;
    }
  }
}

export default function FriendInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { user, isGuest, hydrated } = useAuth();
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: "loading" });
  const [redemptionState, setRedemptionState] = useState<RedemptionState>({
    kind: "idle",
  });
  const [redeemAttempt, setRedeemAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewState({ kind: "loading" });
    setRedemptionState({ kind: "idle" });
    setRedeemAttempt(0);

    void previewFriendInvite(token)
      .then((invite) => {
        if (!cancelled) setPreviewState({ kind: "ready", invite });
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewState({
            kind: "error",
            message: "This friend invite is invalid or expired.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    // Wait for auth hydration so we don't flash "sending" before knowing the
    // session. Do not depend on redemptionState — setting "redeeming" used to
    // re-run this effect, cancel the in-flight request, and leave the UI stuck.
    if (
      !hydrated ||
      !user ||
      isGuest ||
      previewState.kind !== "ready" ||
      !token
    ) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRedemptionState({ kind: "redeeming" });

    void redeemFriendInvite(token)
      .then((status) => {
        if (!cancelled) setRedemptionState({ kind: "complete", status });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRedemptionState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not send the friend request.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, isGuest, previewState.kind, redeemAttempt, token, user?.id]);

  const returnTo = `/invite/${encodeURIComponent(token)}`;
  const inviteReady = previewState.kind === "ready";
  const inviterName = inviteReady ? previewState.invite.inviterName : "an Atlas Academy player";
  const showAuthPrompt = !hydrated || !user || isGuest;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 px-4 py-8">
      <main className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-4xl" aria-hidden>
            🤝
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            Atlas Academy
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white">
            Friend invite
          </h1>
        </div>

        <section className="rounded-[2rem] border border-white/15 bg-white/95 p-5 shadow-2xl shadow-teal-950/30 dark:bg-slate-900/95 sm:p-7">
          {previewState.kind === "loading" ? (
            <p className="py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Checking this invite…
            </p>
          ) : previewState.kind === "error" ? (
            <div className="py-6 text-center">
              <p role="alert" className="font-semibold text-rose-700 dark:text-rose-300">
                {previewState.message}
              </p>
              <Link
                href="/auth"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-5 py-2.5 font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)]"
              >
                Open Atlas Academy
              </Link>
            </div>
          ) : redemptionState.kind === "complete" ? (
            <div className="py-5 text-center">
              <p className="text-4xl" aria-hidden>
                {redemptionState.status === "self" ? "🙈" : "🎉"}
              </p>
              <h2 className="mt-3 font-display text-xl font-extrabold text-slate-900 dark:text-white">
                {redemptionState.status === "self" ? "Invite not sent" : "Invite complete"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {getInviteMessage(redemptionState.status, inviterName)}
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-5 py-2.5 font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)]"
              >
                Continue to Atlas Academy
              </Link>
            </div>
          ) : redemptionState.kind === "error" ? (
            <div className="py-6 text-center">
              <p role="alert" className="font-semibold text-rose-700 dark:text-rose-300">
                {redemptionState.message}
              </p>
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-5 py-2.5 font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)]"
                  onClick={() => {
                    setRedemptionState({ kind: "idle" });
                    setRedeemAttempt((attempt) => attempt + 1);
                  }}
                >
                  Try again
                </button>
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Continue to Atlas Academy
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-emerald-500/10 px-4 py-5 text-center dark:bg-emerald-400/10">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  <span className="font-black">{inviterName}</span> wants to add you as a
                  friend.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
                  Sign in or create an account and Atlas Academy will send the friend request
                  automatically.
                </p>
              </div>

              {showAuthPrompt ? (
                <Link
                  href={`/auth?next=${encodeURIComponent(returnTo)}`}
                  className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-center font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition hover:bg-emerald-400"
                >
                  Sign in or create an account
                </Link>
              ) : (
                <p className="mt-5 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Sending your friend request…
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
