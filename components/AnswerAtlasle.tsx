"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  atlasleLetterCount,
  atlasleLetters,
  buildAtlasleClues,
  collectAtlasleDictionary,
  formatGuessIntoPattern,
  getUnlockedClueCount,
  patternStatuses,
  scoreAtlasleGuess,
  toAtlaslePattern,
  type AtlasleTileStatus,
} from "@/lib/atlasle";
import { getCountryByCode, getPlacesForScope } from "@/lib/countries";
import { scopeText } from "@/lib/scope";
import type { AtlasleGuessTarget, Difficulty, GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type GuessRow = {
  pattern: string;
  statuses: AtlasleTileStatus[];
};

type AnswerAtlasleProps = {
  countryCode: string;
  correctAnswer: string;
  target: AtlasleGuessTarget;
  maxGuesses: number;
  difficulty: Difficulty;
  scope: GameScope;
  disabled?: boolean;
  onComplete: (correct: boolean, finalGuess: string) => void;
};

function Tile({
  char,
  status,
  size = "md",
}: {
  char: string;
  status: AtlasleTileStatus;
  size?: "sm" | "md";
}) {
  if (char === " ") {
    return <span className={cn("inline-block", size === "sm" ? "w-2" : "w-3")} aria-hidden />;
  }

  const isBlankSlot = status === "empty";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border-2 font-display font-black uppercase",
        size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-base sm:h-10 sm:w-10 sm:text-lg",
        status === "correct" &&
          "border-emerald-600 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-600",
        status === "present" &&
          "border-amber-500 bg-amber-400 text-slate-900 dark:border-amber-400 dark:bg-amber-500",
        status === "absent" &&
          "border-slate-400 bg-slate-400 text-white dark:border-slate-500 dark:bg-slate-600",
        isBlankSlot && "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800",
      )}
    >
      {isBlankSlot ? "" : char}
    </span>
  );
}

function PatternRow({
  pattern,
  statuses,
  size = "md",
}: {
  pattern: string;
  statuses: AtlasleTileStatus[];
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {pattern.split("").map((char, index) => (
        <Tile key={`${index}-${char}`} char={char} status={statuses[index] ?? "empty"} size={size} />
      ))}
    </div>
  );
}

export function AnswerAtlasle({
  countryCode,
  correctAnswer,
  target,
  maxGuesses,
  difficulty,
  scope,
  disabled = false,
  onComplete,
}: AnswerAtlasleProps) {
  const answerPattern = useMemo(() => toAtlaslePattern(correctAnswer), [correctAnswer]);
  const answerLetters = useMemo(() => atlasleLetters(answerPattern), [answerPattern]);
  const letterCount = answerLetters.length;

  const dictionary = useMemo(
    () => collectAtlasleDictionary(getPlacesForScope(scope), target, letterCount),
    [scope, target, letterCount],
  );

  const country = getCountryByCode(countryCode);
  const clues = useMemo(
    () => (country ? buildAtlasleClues(country, target, scope) : []),
    [country, target, scope],
  );

  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [resolved, setResolved] = useState(false);

  const wrongGuesses = guesses.length;
  const unlockedClues = getUnlockedClueCount(wrongGuesses, difficulty, clues.length);
  const guessesLeft = maxGuesses - guesses.length;
  const blankStatuses = useMemo(
    () => answerPattern.split("").map(() => "empty" as const),
    [answerPattern],
  );

  useEffect(() => {
    setGuesses([]);
    setValue("");
    setMessage(null);
    setResolved(false);
  }, [countryCode, correctAnswer, target]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || resolved) return;

    const pattern = toAtlaslePattern(value);
    const letters = atlasleLetters(pattern);
    if (letters.length !== letterCount) {
      setMessage(`Use exactly ${letterCount} letters`);
      return;
    }
    if (!dictionary.has(letters)) {
      setMessage(
        scopeText(
          target === "capital" ? "Not a known capital in the atlas" : "Not a known country in the atlas",
          scope,
        ),
      );
      return;
    }

    const statuses = patternStatuses(scoreAtlasleGuess(letters, answerLetters), answerPattern);
    const displayPattern = formatGuessIntoPattern(letters, answerPattern);
    const nextGuesses = [...guesses, { pattern: displayPattern, statuses }];
    setGuesses(nextGuesses);
    setValue("");
    setMessage(null);

    const isWin = letters === answerLetters;
    if (isWin) {
      setResolved(true);
      onComplete(true, displayPattern);
      return;
    }

    if (nextGuesses.length >= maxGuesses) {
      setResolved(true);
      onComplete(false, displayPattern);
    }
  }

  const targetLabel =
    target === "capital"
      ? "Capital city"
      : scopeText(scope === "usa" ? "State name" : "Country name", scope);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
          {targetLabel}
        </span>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {letterCount} letters
          {atlasleLetterCount(answerPattern) !== answerPattern.length
            ? ` · ${answerPattern.split(" ").length} words`
            : ""}
        </span>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {guessesLeft} guess{guessesLeft === 1 ? "" : "es"} left
        </span>
      </div>

      {unlockedClues > 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/80 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700/80 dark:text-amber-400/80">
            Clues
          </p>
          <ul className="space-y-1">
            {clues.slice(0, unlockedClues).map((clue) => (
              <li key={clue} className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                {clue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {unlockedClues === 0 && (
        <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          Miss to unlock geography clues
        </p>
      )}

      <div className="space-y-1.5">
        {guesses.map((row, index) => (
          <PatternRow key={`guess-${index}`} pattern={row.pattern} statuses={row.statuses} size="sm" />
        ))}
        {!resolved && <PatternRow pattern={answerPattern} statuses={blankStatuses} size="sm" />}
        {resolved && guesses[guesses.length - 1]?.pattern !== answerPattern && (
          <PatternRow
            pattern={answerPattern}
            statuses={answerPattern.split("").map((ch) => (ch === " " ? "empty" : "correct"))}
            size="sm"
          />
        )}
      </div>

      {!resolved && (
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3"
        >
          <input
            type="text"
            name="atlasle-guess"
            value={value}
            readOnly={!focused}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setValue(e.target.value);
              if (message) setMessage(null);
            }}
            disabled={disabled}
            placeholder={`Type ${letterCount}-letter guess...`}
            className="min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base uppercase shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900 sm:text-sm"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
          />
          <Button type="submit" disabled={disabled || !value.trim()}>
            Guess
          </Button>
        </form>
      )}

      {message && (
        <p className="text-center text-sm font-bold text-rose-600 dark:text-rose-400" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
