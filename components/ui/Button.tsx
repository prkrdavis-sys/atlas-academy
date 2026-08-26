import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, Ref } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  const hasLip = variant !== "ghost";
  const hasBorder = variant === "secondary";

  return (
    <button
      ref={ref}
      className={cn(
        // Game-style press: thick bottom edge that collapses on :active
        "relative inline-flex min-h-11 appearance-none items-center justify-center rounded-2xl font-bold transition-all duration-100",
        "active:translate-y-[3px] active:shadow-none",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        // Native outline hugs the face, not the 3px lip, and can shift on a
        // transformed ancestor. Draw the ring on ::after around the full 3D box.
        "focus-visible:outline-none",
        "after:pointer-events-none after:absolute after:border-[3px] after:border-transparent after:content-['']",
        "focus-visible:after:border-[rgb(14_165_233_/_0.45)]",
        hasLip &&
          !hasBorder &&
          "after:-inset-x-[5px] after:-top-[5px] after:-bottom-[8px] after:rounded-[calc(1rem+5px)]",
        hasLip &&
          hasBorder &&
          "after:-inset-x-[7px] after:-top-[7px] after:-bottom-[10px] after:rounded-[calc(1rem+5px)]",
        !hasLip && "after:-inset-[5px] after:rounded-[calc(1rem+5px)]",
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
