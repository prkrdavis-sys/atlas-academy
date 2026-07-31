/**
 * One-off generator for scripts/airport-data.ts — run with:
 *   tsx scripts/generate-airport-data-module.ts > scripts/airport-data.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COUNTRIES_WITHOUT_AIRPORT,
  COUNTRY_AIRPORT_PRIORITY,
  MANUAL_COUNTRY_AIRPORTS,
  STATE_AIRPORTS,
} from "./airport-data-sources";

type CsvRow = string[];

async function parseCsv(text: string): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function main() {
  const response = await fetch(
    "https://davidmegginson.github.io/ourairports-data/airports.csv",
  );
  if (!response.ok) throw new Error("Failed to fetch OurAirports CSV");

  const rows = await parseCsv(await response.text());
  const headers = rows[0];
  const idx = Object.fromEntries(headers.map((header, index) => [header, index]));

  const countryAirports = new Map<string, Set<string>>();
  for (const cols of rows.slice(1)) {
    const iso = cols[idx.iso_country];
    const iata = cols[idx.iata_code];
    const scheduled = cols[idx.scheduled_service];
    if (!iata || scheduled !== "yes") continue;
    const set = countryAirports.get(iso) ?? new Set<string>();
    set.add(iata);
    countryAirports.set(iso, set);
  }

  const countries = JSON.parse(
    readFileSync(join(process.cwd(), "data", "countries.json"), "utf8"),
  ) as { code: string; name: string }[];

  const resolved: Record<string, string> = {};
  const missing: string[] = [];

  for (const country of countries) {
    if (COUNTRIES_WITHOUT_AIRPORT.has(country.code)) continue;

    const manual = MANUAL_COUNTRY_AIRPORTS[country.code];
    if (manual) {
      resolved[country.code] = manual;
      continue;
    }

    const priorities = COUNTRY_AIRPORT_PRIORITY[country.code];
    const available = countryAirports.get(country.code) ?? new Set<string>();
    let picked: string | undefined;

    if (priorities) {
      for (const iata of priorities) {
        if (available.has(iata)) {
          picked = iata;
          break;
        }
      }
    }

    if (!picked) {
      for (const cols of rows.slice(1)) {
        if (cols[idx.iso_country] !== country.code) continue;
        const iata = cols[idx.iata_code];
        const type = cols[idx.type];
        const scheduled = cols[idx.scheduled_service];
        if (
          iata &&
          scheduled === "yes" &&
          (type === "large_airport" || type === "medium_airport")
        ) {
          picked = iata;
          break;
        }
      }
    }

    if (picked) resolved[country.code] = picked;
    else missing.push(`${country.code} ${country.name}`);
  }

  if (missing.length > 0) {
    throw new Error(`Missing airport mapping for:\n${missing.join("\n")}`);
  }

  const sortedCountryEntries = Object.entries(resolved).toSorted(([a], [b]) =>
    a.localeCompare(b),
  );
  const sortedStateEntries = Object.entries(STATE_AIRPORTS).toSorted(([a], [b]) =>
    a.localeCompare(b),
  );
  const sortedNoAirport = [...COUNTRIES_WITHOUT_AIRPORT].toSorted();

  console.log(`/**
 * Primary commercial airport IATA codes for library detail chips.
 * Countries: busiest gateway airport with scheduled passenger service.
 * States: busiest airport located in the state.
 *
 * Regenerate with: tsx scripts/generate-airport-data-module.ts > scripts/airport-data.ts
 */`);

  console.log(`export const COUNTRIES_WITHOUT_AIRPORT = new Set<string>([
${sortedNoAirport.map((code) => `  "${code}",`).join("\n")}
]);`);

  console.log(`
export const COUNTRY_AIRPORTS: Record<string, string> = {
${sortedCountryEntries.map(([code, iata]) => `  ${code}: "${iata}",`).join("\n")}
};`);

  console.log(`
export const STATE_AIRPORTS: Record<string, string> = {
${sortedStateEntries.map(([postal, iata]) => `  ${postal}: "${iata}",`).join("\n")}
};

export function getCountryAirport(code: string): string | undefined {
  if (COUNTRIES_WITHOUT_AIRPORT.has(code)) return undefined;
  return COUNTRY_AIRPORTS[code];
}

export function getStateAirport(postal: string): string | undefined {
  return STATE_AIRPORTS[postal.toUpperCase()];
}

export { COUNTRY_TRAVEL_ACCESS, getCountryTravelAccess } from "./airport-data-sources";
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
