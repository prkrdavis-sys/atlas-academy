/**
 * Median household income for library detail chips (USD equivalent).
 * Countries: Our World in Data / World Bank PIP daily median income (2021 PPP), annualized.
 * US states: Census ACS 2023 median household income (current USD).
 * @see https://ourworldindata.org/grapher/daily-median-income
 * @see https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_income
 */

const OWID_DAILY_MEDIAN_INCOME_CSV =
  "https://ourworldindata.org/grapher/daily-median-income.csv";

/** Urban-only World Bank series mapped to national ISO3 when no national series exists. */
const URBAN_ENTITY_TO_CODE3: Record<string, string> = {
  "Argentina (urban)": "ARG",
};

/** Census ACS 2023 median household income by USPS state code. */
export const STATE_MEDIAN_HOUSEHOLD_INCOME_USD: Record<string, number> = {
  AK: 88_121,
  AL: 62_212,
  AR: 58_700,
  AZ: 77_315,
  CA: 95_521,
  CO: 92_911,
  CT: 91_665,
  DE: 82_174,
  FL: 73_311,
  GA: 74_632,
  HI: 95_322,
  IA: 71_433,
  ID: 74_942,
  IL: 80_306,
  IN: 69_477,
  KS: 70_333,
  KY: 61_118,
  LA: 58_229,
  MA: 99_858,
  MD: 98_678,
  ME: 73_733,
  MI: 69_183,
  MN: 85_086,
  MO: 68_545,
  MS: 54_203,
  MT: 70_804,
  NC: 70_804,
  ND: 76_525,
  NE: 74_590,
  NH: 96_838,
  NJ: 99_781,
  NM: 62_268,
  NV: 76_364,
  NY: 82_095,
  OH: 67_769,
  OK: 62_138,
  OR: 80_160,
  PA: 73_824,
  RI: 84_972,
  SC: 67_804,
  SD: 71_810,
  TN: 67_631,
  TX: 75_780,
  UT: 93_421,
  VA: 89_931,
  VT: 81_211,
  WA: 94_605,
  WI: 74_631,
  WV: 55_948,
  WY: 72_415,
};

export function getStateMedianHouseholdIncomeUsd(postal: string): number | undefined {
  return STATE_MEDIAN_HOUSEHOLD_INCOME_USD[postal.toUpperCase()];
}

/** Annualize World Bank / OWID daily median income (2021 PPP international dollars). */
export function annualizeDailyMedianIncome(daily: number): number {
  return Math.round(daily * 365);
}

type OwidRow = {
  Entity: string;
  Code: string;
  Year: string;
  Median: string;
};

/**
 * Latest annualized median income (USD PPP) keyed by ISO 3166-1 alpha-3.
 * Prefers national series; falls back to curated urban-only series when needed.
 */
export async function fetchCountryMedianHouseholdIncomeUsd(): Promise<Map<string, number>> {
  const response = await fetch(OWID_DAILY_MEDIAN_INCOME_CSV);
  if (!response.ok) {
    throw new Error(`Failed to fetch OWID median income CSV (${response.status})`);
  }

  const text = await response.text();
  const latestByCode3 = new Map<string, { year: number; daily: number }>();

  for (const row of parseOwidCsv(text)) {
    const year = Number(row.Year);
    const daily = Number(row.Median);
    if (!Number.isFinite(year) || !Number.isFinite(daily)) continue;

    const code3 = row.Code.trim().toUpperCase() || URBAN_ENTITY_TO_CODE3[row.Entity.trim()];
    if (!code3 || code3.length !== 3) continue;

    const existing = latestByCode3.get(code3);
    // Prefer coded national rows over urban fallbacks when years tie.
    const isNational = Boolean(row.Code.trim());
    if (
      !existing ||
      year > existing.year ||
      (year === existing.year && isNational)
    ) {
      latestByCode3.set(code3, { year, daily });
    }
  }

  const annualByCode3 = new Map<string, number>();
  for (const [code3, { daily }] of latestByCode3) {
    annualByCode3.set(code3, annualizeDailyMedianIncome(daily));
  }
  return annualByCode3;
}

function parseOwidCsv(text: string): OwidRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const index = {
    Entity: headers.indexOf("Entity"),
    Code: headers.indexOf("Code"),
    Year: headers.indexOf("Year"),
    Median: headers.indexOf("Median"),
  };
  if (Object.values(index).some((i) => i < 0)) {
    throw new Error("Unexpected OWID median income CSV headers");
  }

  const rows: OwidRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = splitCsvLine(line);
    rows.push({
      Entity: cells[index.Entity] ?? "",
      Code: cells[index.Code] ?? "",
      Year: cells[index.Year] ?? "",
      Median: cells[index.Median] ?? "",
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}
