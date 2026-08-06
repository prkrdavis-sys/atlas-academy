"use client";

import { SettingsSheet } from "@/components/ui/SettingsSheet";
import { getRegionShapePath } from "@/lib/continent-shapes";
import {
  countAllTerritories,
  countSovereignCountriesByContinents,
  getRegionsForScope,
} from "@/lib/countries";
import { findMatchingPreset, getRegionPresets } from "@/lib/region-presets";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope, Region } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlacesSheetProps = {
  open: boolean;
  onClose: () => void;
  scope: GameScope;
  selected: Region[];
  includeTerritories: boolean;
  poolSize: number;
  onChange: (next: { continents: Region[]; includeTerritories: boolean }) => void;
};

export function PlacesSheet({
  open,
  onClose,
  scope,
  selected,
  includeTerritories,
  poolSize,
  onChange,
}: PlacesSheetProps) {
  const scopeInfo = SCOPE_INFO[scope];
  const isUsa = scope === "usa";
  const regions = getRegionsForScope(scope);
  // Antarctica holds no sovereign states, so it rides with the extras below
  // rather than competing with the real continents.
  const mainRegions = isUsa ? regions : regions.filter((region) => region !== "Antarctica");
  const presets = getRegionPresets(scope);
  const activePreset = findMatchingPreset(selected, scope);
  const nothingSelected = selected.length === 0 && !(includeTerritories && !isUsa);

  const toggleRegion = (region: Region) => {
    onChange({
      continents: selected.includes(region)
        ? selected.filter((current) => current !== region)
        : [...selected, region],
      includeTerritories,
    });
  };

  return (
    <SettingsSheet
      open={open}
      onClose={onClose}
      title={isUsa ? "Regions" : "Places"}
      description={`Which ${scopeInfo.nounPlural} can show up in your questions.`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p
            aria-live="polite"
            className={cn(
              "text-sm font-semibold",
              nothingSelected
                ? "text-amber-700 dark:text-amber-300"
                : "text-slate-700 dark:text-slate-200",
            )}
          >
            {nothingSelected
              ? `Pick at least one ${isUsa ? "region" : "continent"}`
              : `${poolSize} ${poolSize === 1 ? scopeInfo.noun : scopeInfo.nounPlural} in play`}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={nothingSelected}
            className="min-h-11 shrink-0 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 px-6 font-display text-sm font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quick picks
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((preset) => {
              const active = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      // Presets set continents only; Antarctica and territories
                      // stay under the user's separate control below.
                      continents: [
                        ...preset.regions,
                        ...(selected.includes("Antarctica") ? (["Antarctica"] as Region[]) : []),
                      ],
                      includeTerritories,
                    })
                  }
                  className={cn(
                    "min-h-10 rounded-full border-2 px-3.5 text-sm font-semibold transition-colors",
                    active
                      ? "border-teal-500 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={nothingSelected}
              onClick={() =>
                onChange({
                  continents: [],
                  includeTerritories: false,
                })
              }
              className={cn(
                "min-h-10 rounded-full border-2 px-3.5 text-sm font-semibold transition-colors",
                nothingSelected
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600",
              )}
            >
              Clear selection
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isUsa ? "Or pick regions" : "Or pick continents"}
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mainRegions.map((region) => (
              <RegionCard
                key={region}
                region={region}
                scope={scope}
                checked={selected.includes(region)}
                onToggle={() => toggleRegion(region)}
              />
            ))}
          </div>
        </section>

        {isUsa ? null : (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Also include
            </h3>
            <div className="mt-2 space-y-2">
              <ExtraToggle
                label="Territories"
                hint={`${countAllTerritories()} dependencies and overseas territories`}
                checked={includeTerritories}
                onToggle={() =>
                  onChange({ continents: selected, includeTerritories: !includeTerritories })
                }
              />
              <ExtraToggle
                label="Antarctica"
                hint="Research bases only — no sovereign countries"
                checked={selected.includes("Antarctica")}
                onToggle={() => toggleRegion("Antarctica")}
              />
            </div>
          </section>
        )}
      </div>
    </SettingsSheet>
  );
}

type RegionCardProps = {
  region: Region;
  scope: GameScope;
  checked: boolean;
  onToggle: () => void;
};

/** Silhouette tile so continents are recognizable at a glance, not just words. */
function RegionCard({ region, scope, checked, onToggle }: RegionCardProps) {
  const count = countSovereignCountriesByContinents([region], scope);
  const scopeInfo = SCOPE_INFO[scope];

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl border-2 px-2 pb-2 pt-2.5 transition-colors",
        checked
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-12 w-full items-center justify-center transition-colors",
          checked ? "text-teal-700 dark:text-teal-300" : "text-slate-400 dark:text-slate-500",
        )}
        style={{
          maskImage: `url(${getRegionShapePath(region)})`,
          WebkitMaskImage: `url(${getRegionShapePath(region)})`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          backgroundColor: "currentColor",
        }}
      />
      <span
        className={cn(
          "text-center text-xs font-bold leading-tight",
          checked ? "text-emerald-900 dark:text-emerald-100" : "text-slate-700 dark:text-slate-300",
        )}
      >
        {region}
      </span>
      <span className="text-[0.7rem] tabular-nums text-slate-500 dark:text-slate-400">
        {count} {count === 1 ? scopeInfo.noun : scopeInfo.nounPlural}
      </span>
    </button>
  );
}

type ExtraToggleProps = {
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
};

function ExtraToggle({ label, hint, checked, onToggle }: ExtraToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        checked
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold text-white",
          checked
            ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500"
            : "border-slate-300 dark:border-slate-600",
        )}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </button>
  );
}
