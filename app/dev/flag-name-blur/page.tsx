"use client";

import { FlagDisplay } from "@/components/FlagDisplay";
import { getFlagNameRegions } from "@/lib/flag-name-regions";

const CODES = [
  "US-OR",
  "US-SD",
  "US-KY",
  "US-WA",
  "US-FL",
  "US-ID",
  "US-NH",
  "US-NE",
  "US-WV",
  "US-WY",
  "US-CA",
  "US-IN",
  "US-VA",
  "US-ND",
  "US-ME",
  "US-NV",
  "US-WI",
  "US-AR",
  "US-MT",
  "US-KS",
  "US-OK",
  "US-IL",
  "US-IA",
  "US-VT",
  "US-NC",
  "US-TN",
];

export default function FlagNameBlurPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-6 text-sm font-semibold">Flag name blur</h1>
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {CODES.map((code) => (
          <div key={code} className="flex flex-col items-center gap-2">
            <FlagDisplay code={code} size="md" />
            <span className="text-xs">
              {code}
              {getFlagNameRegions(code).length === 0 ? " · no name" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
