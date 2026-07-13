import { getCountryByCode } from "@/lib/countries";
import type { Country } from "@/lib/types";

export function normalizeAnswerText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Normalized forms an input may take: the raw text plus a version with a
 * leading article stripped ("the gambia" -> "gambia").
 */
function inputVariants(input: string): string[] {
  const normalized = normalizeAnswerText(input);
  if (!normalized) return [];
  const variants = [normalized];
  if (normalized.startsWith("the ")) variants.push(normalized.slice(4));
  return variants;
}

/**
 * Strict matching: the typed answer must exactly equal one of the accepted
 * candidates after normalization. Substring matching was intentionally
 * removed — it caused wrong answers like "Niger" to match "Nigeria".
 */
export function matchesAnswer(
  input: string,
  country: Country,
  field: "name" | "capital" = "name",
): boolean {
  const variants = inputVariants(input);
  if (variants.length === 0) return false;

  const candidates =
    field === "capital"
      ? [country.capital]
      : [country.name, country.officialName, ...country.aliases];

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeAnswerText(candidate);
    if (!normalizedCandidate) return false;
    const candidateVariants = [normalizedCandidate];
    if (normalizedCandidate.startsWith("the ")) {
      candidateVariants.push(normalizedCandidate.slice(4));
    }
    return variants.some((variant) => candidateVariants.includes(variant));
  });
}

export function matchesCountryCode(input: string, code: string): boolean {
  return normalizeAnswerText(input) === normalizeAnswerText(code);
}

/** True when both codes (cca2 or cca3, any case) resolve to the same country. */
export function isSameCountry(codeA: string, codeB: string): boolean {
  if (codeA === codeB) return true;
  const a = getCountryByCode(codeA.toUpperCase());
  const b = getCountryByCode(codeB.toUpperCase());
  return Boolean(a && b && a.code === b.code);
}

export function getAcceptedAnswers(country: Country, field: "name" | "capital" = "name"): string[] {
  if (field === "capital") return [country.capital];
  return [country.name, ...country.aliases.filter((a) => a !== country.name.toLowerCase())];
}

export function validateAnswer(
  input: string,
  correctCode: string,
  field: "name" | "capital" = "name",
): boolean {
  const country = getCountryByCode(correctCode);
  if (!country) return false;
  return matchesAnswer(input, country, field);
}
