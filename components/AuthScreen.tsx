"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";

type AuthMode = "sign-in" | "sign-up";

export function AuthScreen({
  returnTo = "/profiles",
  passwordResetSuccess = false,
}: {
  returnTo?: string;
  passwordResetSuccess?: boolean;
}) {
  const router = useRouter();
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    passwordResetSuccess
      ? "Password updated. Sign in with your email and new password."
      : "",
  );
  const [messageTone, setMessageTone] = useState<"success" | "warning">(
    passwordResetSuccess ? "success" : "warning",
  );
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "sign-up";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setMessageTone("warning");
    setPassword("");
    setConfirmPassword("");
  }

  function handleContinueAsGuest() {
    setError("");
    setMessage("");
    setMessageTone("warning");
    continueAsGuest();
    router.push("/profiles");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setMessageTone("warning");

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const result = isSignUp
      ? await signUp(normalizedEmail, password)
      : await signIn(normalizedEmail, password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsConfirmation) {
      setMessageTone("warning");
      setMessage(
        "Your account was created, but Supabase is waiting for email confirmation. Turn off Confirm email in the Supabase Email provider settings to use sign-in without verification.",
      );
      return;
    }

    router.push(returnTo);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 px-4 py-8">
      <main className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-4xl" aria-hidden>
            🌍
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
            Atlas Academy
          </h1>
          <p className="mt-2 text-sm text-teal-100">
            Sign in to sync progress across devices, or continue as a guest on this device.
          </p>
        </div>

        <section className="rounded-[2rem] border border-white/15 bg-white/95 p-5 shadow-2xl shadow-teal-950/30 dark:bg-slate-900/95 sm:p-7">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                !isSignUp
                  ? "bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("sign-up")}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                isSignUp
                  ? "bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="mt-6">
            <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {isSignUp
                ? "Use your email and password to save progress across devices."
                : "Your child profiles and progress are ready when you are."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="auth-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-900 sm:text-sm"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label htmlFor="auth-password" className="block text-sm font-medium">
                  Password
                </label>
                {!isSignUp && (
                  <Link
                    href={
                      email.trim()
                        ? `/auth/forgot-password?email=${encodeURIComponent(email.trim())}`
                        : "/auth/forgot-password"
                    }
                    className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-900 sm:text-sm"
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="auth-confirm-password" className="mb-1 block text-sm font-medium">
                  Confirm password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-900 sm:text-sm"
                />
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className={
                  messageTone === "success"
                    ? "rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                }
              >
                {message}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-5 flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="mt-5 w-full"
            onClick={handleContinueAsGuest}
            disabled={busy}
          >
            Sign in as guest
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Guest progress stays on this device only. You can create an account later to sync it.
          </p>
        </section>
      </main>
    </div>
  );
}
