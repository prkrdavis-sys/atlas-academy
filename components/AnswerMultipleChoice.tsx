"use client";

import { cn } from "@/lib/utils";

type AnswerMultipleChoiceProps = {
  options: string[];
  optionCodes?: string[];
  onSelect: (answer: string, code?: string) => void;
  disabled?: boolean;
  hiddenOptions?: string[];
  revealed?: boolean;
  selectedAnswer?: string | null;
  selectedCode?: string | null;
  correctAnswer?: string;
  correctCode?: string;
};

const BASE_OPTION_CLASS =
  "min-h-[3.25rem] rounded-2xl border-2 px-2 py-3 text-center text-[13px] font-semibold leading-tight sm:px-4 sm:py-4 sm:text-left sm:text-sm";

const NEUTRAL_OPTION_CLASS = cn(
  BASE_OPTION_CLASS,
  "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  "shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 dark:shadow-[0_3px_0_var(--color-slate-700)]",
  "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 dark:hover:border-sky-500 dark:hover:bg-sky-950/50 dark:hover:text-sky-300",
  "active:translate-y-[3px] active:shadow-none",
  "disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0_var(--color-slate-200)]",
);

const CORRECT_REVEAL_CLASS = cn(
  BASE_OPTION_CLASS,
  "border-emerald-400 bg-emerald-100 text-emerald-900 shadow-[0_3px_0_var(--color-emerald-300)]",
  "dark:border-emerald-500 dark:bg-emerald-950/70 dark:text-emerald-100 dark:shadow-[0_3px_0_var(--color-emerald-800)]",
);

const INCORRECT_REVEAL_CLASS = cn(
  BASE_OPTION_CLASS,
  "border-rose-400 bg-rose-100 text-rose-900 shadow-[0_3px_0_var(--color-rose-300)]",
  "dark:border-rose-500 dark:bg-rose-950/70 dark:text-rose-100 dark:shadow-[0_3px_0_var(--color-rose-800)]",
);

function isOptionCorrect(
  option: string,
  code: string | undefined,
  correctAnswer?: string,
  correctCode?: string,
) {
  if (correctCode && code && code === correctCode) return true;
  if (correctAnswer && option === correctAnswer) return true;
  return false;
}

function isOptionSelected(
  option: string,
  code: string | undefined,
  selectedAnswer?: string | null,
  selectedCode?: string | null,
) {
  if (selectedCode && code && code === selectedCode) return true;
  if (selectedAnswer && option === selectedAnswer) return true;
  return false;
}

export function AnswerMultipleChoice({
  options,
  optionCodes,
  onSelect,
  disabled,
  hiddenOptions = [],
  revealed = false,
  selectedAnswer = null,
  selectedCode = null,
  correctAnswer,
  correctCode,
}: AnswerMultipleChoiceProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {options.map((option, index) => {
        if (hiddenOptions.includes(option)) return null;
        const code = optionCodes?.[index];
        const isCorrect = isOptionCorrect(option, code, correctAnswer, correctCode);
        const isSelected = isOptionSelected(option, code, selectedAnswer, selectedCode);

        let optionClass = NEUTRAL_OPTION_CLASS;
        if (revealed) {
          if (isCorrect) {
            optionClass = CORRECT_REVEAL_CLASS;
          } else if (isSelected) {
            optionClass = INCORRECT_REVEAL_CLASS;
          } else {
            optionClass = cn(
              BASE_OPTION_CLASS,
              "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
              "shadow-[0_3px_0_var(--color-slate-200)] dark:shadow-[0_3px_0_var(--color-slate-700)]",
            );
          }
        }

        const content = <>{option}</>;

        if (revealed) {
          return (
            <div key={`${option}-${index}`} className={optionClass} aria-hidden>
              {content}
            </div>
          );
        }

        return (
          <button
            key={`${option}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option, code)}
            className={optionClass}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
