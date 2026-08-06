"use client";

import { cn } from "@/lib/utils";

type MenuSwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  className?: string;
};

/** Compact label + oval on/off switch for the header main menu. */
export function MenuSwitch({
  label,
  checked,
  onCheckedChange,
  className,
}: MenuSwitchProps) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-xl px-2.5 py-2",
        className,
      )}
    >
      <span className="min-w-0 text-sm font-medium leading-snug text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked
            ? "bg-teal-600 dark:bg-teal-500"
            : "bg-slate-200 dark:bg-slate-700",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
