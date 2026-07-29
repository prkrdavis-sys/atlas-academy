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

  function submitAnswer() {
    const answer = value.replace(/\s+/g, " ").trim();
    if (!answer) return;
    onSubmit(answer);
    setValue("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitAnswer();
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-2 sm:gap-3">
      {/*
        Textarea (not <input type="text">) avoids mobile contact/name autofill
        chips while keeping autocorrect. Tall "paragraph" size keeps the field
        visible above the on-screen keyboard.
      */}
      <textarea
        rows={4}
        name="atlas-hard-mode-answer"
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="words"
        spellCheck
        inputMode="text"
        enterKeyHint="done"
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitAnswer();
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[7.5rem] min-w-0 resize-none rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base leading-relaxed shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900 sm:min-h-[6.5rem] sm:text-sm"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || !value.trim()}>
          Submit
        </Button>
      </div>
    </form>
  );
}
