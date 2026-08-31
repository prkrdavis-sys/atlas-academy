import { normalizeAnswerText } from "@/lib/answer-matcher";

export type LabeledSearchValues = {
  label: string;
  values: string[];
};

/**
 * Dedupes a searchable label by category. Returns null when the label is empty
 * or already recorded.
 */
export function uniqueLabeledValues(
  seen: Set<string>,
  label: string | undefined,
  category: string,
  extraValues: string[] = [],
): LabeledSearchValues | null {
  const trimmedLabel = label?.trim();
  if (!trimmedLabel || !normalizeAnswerText(trimmedLabel)) return null;

  const values = [...new Set([trimmedLabel, ...extraValues])].filter(
    (value) => normalizeAnswerText(value).length > 0,
  );
  if (values.length === 0) return null;

  const key = `${category}:${normalizeAnswerText(trimmedLabel)}`;
  if (seen.has(key)) return null;
  seen.add(key);
  return { label: trimmedLabel, values };
}
