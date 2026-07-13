"use client";

import { CONTINENTS, type Continent } from "@/lib/types";
import { countTerritoriesByContinents } from "@/lib/countries";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type TerritoryFilterProps = {
  selected: Continent[];
  onChange: (continents: Continent[]) => void;
};

export function TerritoryFilter({ selected, onChange }: TerritoryFilterProps) {
  const count = countTerritoriesByContinents(selected);

  function toggle(continent: Continent) {
    if (selected.includes(continent)) {
      onChange(selected.filter((c) => c !== continent));
    } else {
      onChange([...selected, continent]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...CONTINENTS])}
        >
          Select all
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
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
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {selected.length === 0
          ? "Territories like Puerto Rico, Hong Kong, and Greenland are excluded. Select continents above to add them."
          : `${count} territor${count === 1 ? "y" : "ies"} across ${selected.length} continent${selected.length === 1 ? "" : "s"}.`}
      </p>
    </div>
  );
}
