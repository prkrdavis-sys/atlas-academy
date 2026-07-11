import { getCountryByCode } from "@/lib/countries";
import type { Country } from "@/lib/types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export function matchesAnswer(input: string, country: Country, field: "name" | "capital" = "name"): boolean {
  const normalizedInput = normalize(input);
  if (!normalizedInput) return false;

  const candidates = field === "capital"
    ? [country.capital]
    : [country.name, country.officialName, ...country.aliases];

  return candidates.some((candidate) => {
    const normalizedCandidate = normalize(candidate);
    return (
      normalizedInput === normalizedCandidate ||
      normalizedCandidate.includes(normalizedInput) ||
      normalizedInput.includes(normalizedCandidate)
    );
  });
}

export function matchesCountryCode(input: string, code: string): boolean {
  return normalize(input) === normalize(code);
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
