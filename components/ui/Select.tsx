import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "min-h-12 w-full cursor-pointer appearance-none rounded-2xl border-2 border-slate-200 bg-white pl-4 pr-10 text-sm font-semibold text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100",
          "hover:border-sky-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
          "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500"
      >
        ▼
      </span>
    </div>
  );
}
