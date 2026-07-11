import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Game-style press: thick bottom edge that collapses on :active
        "inline-flex min-h-11 items-center justify-center rounded-2xl font-bold transition-all duration-100",
        "active:translate-y-[3px] active:shadow-none",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        variant === "primary" &&
          "bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)] hover:bg-emerald-400 disabled:shadow-[0_3px_0_var(--color-emerald-700)]",
        variant === "secondary" &&
          "border-2 border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 hover:text-sky-700 disabled:shadow-[0_3px_0_var(--color-slate-200)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500 dark:hover:text-sky-300 dark:disabled:shadow-[0_3px_0_var(--color-slate-700)]",
        variant === "ghost" && "bg-transparent text-slate-600 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-slate-800",
        variant === "danger" &&
          "bg-rose-500 text-white shadow-[0_3px_0_var(--color-rose-700)] hover:bg-rose-400 disabled:shadow-[0_3px_0_var(--color-rose-700)]",
        size === "sm" && "px-3 py-2 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className,
      )}
      {...props}
      type={type}
    />
  );
}
