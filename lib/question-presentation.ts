import type { Question } from "@/lib/types";

/**
 * Presentation predicates shared by the solo and head-to-head boards, so both
 * lay a question out the same way.
 */

/** Prompts that carry all their information as text, with no media to show. */
export function isTextOnlyPrompt(question: Question): boolean {
  return (
    (question.mode === "country-to-capital" && question.displayType === "text") ||
    (question.mode === "country-to-language" && question.displayType === "text") ||
    (question.mode === "capital-to-country" && question.displayType === "text") ||
    question.mode === "fact-to-country"
  );
}

export function isInvertedFlagRound(question: Question): boolean {
  return (
    question.mode === "inverted-flag-to-country" ||
    question.mode === "inverted-country-to-flag" ||
    question.mode === "inverted-flag-crop-to-country"
  );
}

/** Learn-card maps show a capital pin only when the question was about the capital. */
export function isCapitalQuestion(question: Question): boolean {
  return (
    question.mode === "capital-to-country" ||
    question.mode === "country-to-capital" ||
    question.atlasleTarget === "capital"
  );
}
