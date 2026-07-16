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
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3">
      <input
        type="text"
        name="game-answer"
        value={value}
        readOnly={!focused}
        onFocus={() => setFocused(true)}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900 sm:text-sm"
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Submit
      </Button>
    </form>
  );
}
