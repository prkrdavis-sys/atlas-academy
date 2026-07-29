"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type AnswerTypeInProps = {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function AnswerTypeIn({ onSubmit, disabled, placeholder = "Type your answer..." }: AnswerTypeInProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3"
    >
      <input
        type="text"
        inputMode="text"
        enterKeyHint="done"
        // Non-semantic name + autocomplete token so iOS/Android don't treat this as a contact/name field.
        name="atlas-hard-mode-answer"
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="words"
        spellCheck
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900 sm:text-sm"
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Submit
      </Button>
    </form>
  );
}
