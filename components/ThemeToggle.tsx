"use client";

import { useTheme } from "next-themes";
import { useIsDark } from "@/lib/use-is-dark";
import { cn } from "@/lib/utils";

type ThemePreference = "light" | "dark" | "system";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "menu";
};

function AutoIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function LightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function DarkIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { isDark, ready } = useIsDark();
  const preference: ThemePreference | undefined =
    theme === "light" || theme === "dark" || theme === "system" ? theme : undefined;

  function cycleTheme() {
    if (preference === "light") {
      setTheme("system");
      return;
    }
    if (preference === "system") {
      setTheme("dark");
      return;
    }
    setTheme("light");
  }

  const buttonClassName = cn(
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600",
    className,
  );

  if (!ready) {
    if (variant === "menu") {
      return (
        <div className={cn("px-3 py-2", className)} suppressHydrationWarning>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Appearance
          </p>
          <div className="grid h-11 grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <span className="rounded-lg" />
            <span className="rounded-lg" />
            <span className="rounded-lg" />
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className={buttonClassName}
        suppressHydrationWarning
      >
        <span className="h-5 w-5" />
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <div className={cn("px-3 py-2", className)}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Appearance
        </p>
        <div
          className="grid h-11 grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
          role="group"
          aria-label="Theme"
        >
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-pressed={preference === "light"}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors",
              preference === "light"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <LightIcon className="h-4 w-4 shrink-0" />
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            aria-pressed={preference === "system"}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors",
              preference === "system"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <AutoIcon className="h-4 w-4 shrink-0" />
            Auto
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-pressed={preference === "dark"}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors",
              preference === "dark"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <DarkIcon className="h-4 w-4 shrink-0" />
            Dark
          </button>
        </div>
      </div>
    );
  }

  const iconAriaLabel =
    preference === "light"
      ? "Theme: light. Switch to auto mode."
      : preference === "system"
        ? "Theme: auto. Switch to dark mode."
        : "Theme: dark. Switch to light mode.";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={iconAriaLabel}
      className={buttonClassName}
    >
      {preference === "system" ? (
        <AutoIcon className="h-5 w-5" />
      ) : preference === "dark" || isDark ? (
        <DarkIcon className="h-5 w-5" />
      ) : (
        <LightIcon className="h-5 w-5" />
      )}
    </button>
  );
}
