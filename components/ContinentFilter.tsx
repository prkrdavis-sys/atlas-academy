"use client";

import type { GameScope, Region } from "@/lib/types";
import {
  getRegionsForScope,
} from "@/lib/countries";
import { getRegionFilterSummary } from "@/lib/region-filter-summary";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ContinentFilterProps = {
  selected: Region[];
  includeTerritories: boolean;
  onContinentsChange: (regions: Region[]) => void;
  onIncludeTerritoriesChange: (includeTerritories: boolean) => void;
  scope?: GameScope;
};

export function ContinentFilter({
  selected,
  includeTerritories,
  onContinentsChange,
  onIncludeTerritoriesChange,
  scope = "world",
}: ContinentFilterProps) {
  const regions = getRegionsForScope(scope);
  const isUsa = scope === "usa";
  const mainRegions = isUsa
    ? regions
    : regions.filter((region) => region !== "Antarctica");
  const summary = getRegionFilterSummary(selected, includeTerritories, scope);

  function toggle(region: Region) {
    if (selected.includes(region)) {
      onContinentsChange(selected.filter((c) => c !== region));
    } else {
      onContinentsChange([...selected, region]);
    }
  }

  function selectAll() {
    onContinentsChange([...regions]);
    if (!isUsa) {
      onIncludeTerritoriesChange(true);
    }
  }

  function clearAll() {
    onContinentsChange([]);
    if (!isUsa) {
      onIncludeTerritoriesChange(false);
    }
  }

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
        {mainRegions.map((region) => {
          const checked = selected.includes(region);
          return (
            <label
              key={region}
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
                onChange={() => toggle(region)}
                className="h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600"
              />
              <span className="min-w-0 text-xs font-medium sm:text-sm">{region}</span>
            </label>
          );
        })}
        {!isUsa && (
          <>
            <label
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors sm:gap-3 sm:px-4 sm:py-3",
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
            <label
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors sm:gap-3 sm:px-4 sm:py-3",
                selected.includes("Antarctica")
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700",
              )}
            >
              <input
                type="checkbox"
                checked={selected.includes("Antarctica")}
                onChange={() => toggle("Antarctica")}
                className="h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600"
              />
              <span className="min-w-0 text-xs font-medium sm:text-sm">Antarctica</span>
            </label>
          </>
        )}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">{summary}</p>
    </div>
  );
}
