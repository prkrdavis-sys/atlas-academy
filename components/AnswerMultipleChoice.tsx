"use client";

import { cn } from "@/lib/utils";

type AnswerMultipleChoiceProps = {
  options: string[];
  optionCodes?: string[];
  onSelect: (answer: string, code?: string) => void;
  disabled?: boolean;
  hiddenOptions?: string[];
};

export function AnswerMultipleChoice({
  options,
  optionCodes,
  onSelect,
  disabled,
  hiddenOptions = [],
}: AnswerMultipleChoiceProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {options.map((option, index) => {
        if (hiddenOptions.includes(option)) return null;
        const code = optionCodes?.[index];
        return (
          <button
            key={`${option}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option, code)}
            className={cn(
              "min-h-[3.25rem] rounded-2xl border-2 border-slate-200 bg-white px-2 py-3 text-center text-[13px] font-semibold leading-tight text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:px-4 sm:py-4 sm:text-left sm:text-sm",
              "shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 dark:shadow-[0_3px_0_var(--color-slate-700)]",
              "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 dark:hover:border-sky-500 dark:hover:bg-sky-950/50 dark:hover:text-sky-300",
              "active:translate-y-[3px] active:shadow-none",
              "disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0_var(--color-slate-200)]",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
