"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

type ForgotPasswordStep = "email" | "password";

export function ForgotPasswordScreen({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<ForgotPasswordStep>(initialEmail ? "password" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleEmailContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter the email for your account.");
      return;
    }

    setEmail(normalizedEmail);
    setStep("password");
    router.replace(`/auth/forgot-password?email=${encodeURIComponent(normalizedEmail)}`);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter the email for your account.");
      setStep("email");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/playtester-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Could not reset that password.");
        return;
      }

      router.push("/auth?reset=1");
    } catch {
      setError("Could not reset that password right now.");
    } finally {
      setBusy(false);
    }
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
            Playtester password reset — no email verification required.
          </p>
        </div>

        <section className="rounded-[2rem] border border-white/15 bg-white/95 p-5 shadow-2xl shadow-teal-950/30 dark:bg-slate-900/95 sm:p-7">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {step === "email" ? "Forgot password" : "Choose a new password"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {step === "email"
                ? "Enter the email address for the account you want to reset."
                : `Set a new password for ${email}. This replaces the old password immediately.`}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleEmailContinue} className="mt-6 space-y-4">
              <div>
                <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-900 sm:text-sm"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full">
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="forgot-password" className="mb-1 block text-sm font-medium">
                  New password
                </label>
                <input
                  id="forgot-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-900 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="forgot-confirm-password" className="mb-1 block text-sm font-medium">
                  Confirm new password
                </label>
                <input
                  id="forgot-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-900 sm:text-sm"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="md"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setPassword("");
                  setConfirmPassword("");
                  setStep("email");
                  router.replace("/auth/forgot-password");
                }}
              >
                Use a different email
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link href="/auth" className="font-semibold text-teal-700 hover:underline dark:text-teal-300">
              Back to sign in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
