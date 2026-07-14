"use client";

import { useEffect } from "react";

export type FeedbackBurst = {
  id: number;
  correct: boolean;
};

const BURST_LIFETIME_MS = 950;

function Burst({ burst, onDone }: { burst: FeedbackBurst; onDone: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone(burst.id), BURST_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [burst.id, onDone]);

  return (
    <div className="absolute inset-0 flex items-center justify-center translate-y-[30vh] sm:translate-y-[22vh]">
      {!burst.correct && (
        <div className="animate-screen-flash absolute inset-0 shadow-[inset_0_0_120px_40px_rgb(244_63_94_/_0.35)]" />
      )}
      <div className="relative flex items-center justify-center">
        <div
          className={`animate-feedback-ring absolute h-28 w-28 rounded-full border-4 ${
            burst.correct ? "border-emerald-400" : "border-rose-400"
          }`}
        />
        <div
          className={`${
            burst.correct
              ? "animate-feedback-correct bg-emerald-500 shadow-[0_8px_30px_rgb(16_185_129_/_0.5)]"
              : "animate-feedback-incorrect bg-rose-500 shadow-[0_8px_30px_rgb(244_63_94_/_0.5)]"
          } flex h-28 w-28 items-center justify-center rounded-full text-white`}
        >
          {burst.correct ? (
            <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" aria-hidden>
              <path
                d="M4.5 12.5l5 5 10-11"
                stroke="currentColor"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth={3.5}
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Fixed overlay that plays quick correct/incorrect bursts. It sits above the
 * learn-card backdrop blur but below the card content, and ignores pointer events.
 */
export function AnswerFeedbackLayer({
  bursts,
  onDone,
}: {
  bursts: FeedbackBurst[];
  onDone: (id: number) => void;
}) {
  if (bursts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[52]" aria-hidden>
      {bursts.map((burst) => (
        <Burst key={burst.id} burst={burst} onDone={onDone} />
      ))}
    </div>
  );
}
