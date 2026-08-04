/**
 * Generate data/airport-short-names.json from OurAirports for library chips.
 * Run: tsx scripts/generate-airport-short-names.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { COUNTRY_AIRPORTS, STATE_AIRPORTS } from "./airport-data";
import { deriveShortAirportName } from "./airport-short-name";

type CsvRow = string[];

function parseCsv(text: string): CsvRow[] {
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
  const iataCodes = [
    ...new Set([...Object.values(COUNTRY_AIRPORTS), ...Object.values(STATE_AIRPORTS)]),
  ].toSorted();

  const response = await fetch(
    "https://davidmegginson.github.io/ourairports-data/airports.csv",
  );
  if (!response.ok) throw new Error("Failed to fetch OurAirports CSV");

  const rows = parseCsv(await response.text());
  const headers = rows[0];
  const idx = Object.fromEntries(headers.map((header, index) => [header, index]));
  const wanted = new Set(iataCodes);

  const byIata = new Map<string, { name: string; city: string }>();
  for (const cols of rows.slice(1)) {
    const iata = cols[idx.iata_code];
    if (!iata || !wanted.has(iata) || byIata.has(iata)) continue;
    byIata.set(iata, {
      name: cols[idx.name] ?? "",
      city: cols[idx.municipality] ?? "",
    });
  }

  const missing = iataCodes.filter((iata) => !byIata.has(iata));
  if (missing.length > 0) {
    throw new Error(`Missing OurAirports rows for: ${missing.join(", ")}`);
  }

  const shortNames: Record<string, string> = {};
  for (const iata of iataCodes) {
    const info = byIata.get(iata)!;
    shortNames[iata] = deriveShortAirportName(iata, info.name, info.city);
  }

  const outPath = join(process.cwd(), "data", "airport-short-names.json");
  writeFileSync(outPath, `${JSON.stringify(shortNames, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(shortNames).length} short names to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
