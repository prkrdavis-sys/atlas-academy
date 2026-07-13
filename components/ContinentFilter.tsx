"use client";

import { CONTINENTS, type Continent } from "@/lib/types";
import { countAllTerritories, countSovereignCountriesByContinents } from "@/lib/countries";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ContinentFilterProps = {
  selected: Continent[];
  includeTerritories: boolean;
  onContinentsChange: (continents: Continent[]) => void;
  onIncludeTerritoriesChange: (includeTerritories: boolean) => void;
};

export function ContinentFilter({
  selected,
  includeTerritories,
  onContinentsChange,
  onIncludeTerritoriesChange,
}: ContinentFilterProps) {
  const countryCount = countSovereignCountriesByContinents(selected);
  const territoryCount = countAllTerritories();

  function toggle(continent: Continent) {
    if (selected.includes(continent)) {
      onContinentsChange(selected.filter((c) => c !== continent));
    } else {
      onContinentsChange([...selected, continent]);
    }
  }

  function selectAll() {
    onContinentsChange([...CONTINENTS]);
  }

  function clearAll() {
    onContinentsChange([]);
  }

  const summary = (() => {
    if (selected.length === 0 && !includeTerritories) {
      return "Select at least one continent or territories.";
    }
    if (selected.length > 0 && includeTerritories) {
      return `${countryCount} countr${countryCount === 1 ? "y" : "ies"} and ${territoryCount} territor${territoryCount === 1 ? "y" : "ies"}.`;
    }
    if (includeTerritories) {
      return `${territoryCount} territor${territoryCount === 1 ? "y" : "ies"}.`;
    }
    return `${countryCount} countr${countryCount === 1 ? "y" : "ies"} across ${selected.length} continent${selected.length === 1 ? "" : "s"}.`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
          Select all
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CONTINENTS.map((continent) => {
          const checked = selected.includes(continent);
          return (
            <label
              key={continent}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors sm:gap-3 sm:px-4 sm:py-3",
                checked
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(continent)}
                className="h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600"
              />
              <span className="min-w-0 text-xs font-medium sm:text-sm">{continent}</span>
            </label>
          );
        })}
        <label
          className={cn(
            "col-span-2 flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors sm:gap-3 sm:px-4 sm:py-3",
            includeTerritories
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50"
              : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700",
          )}
        >
          <input
            type="checkbox"
            checked={includeTerritories}
            onChange={() => onIncludeTerritoriesChange(!includeTerritories)}
            className="h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600"
          />
          <span className="min-w-0 text-xs font-medium sm:text-sm">Territories</span>
        </label>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">{summary}</p>
    </div>
  );
}
