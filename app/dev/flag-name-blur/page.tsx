"use client";

import { FlagDisplay } from "@/components/FlagDisplay";
import { getFlagNameRegions } from "@/lib/flag-name-regions";

const FEATURED = ["US-IN", "US-KY", "US-OR", "US-SD"];

const CODES = [
  "US-IN",
  "US-KY",
  "US-OR",
  "US-WV",
  "US-SD",
  "US-WA",
  "US-NE",
  "US-FL",
  "US-ID",
  "US-NH",
  "US-ND",
  "US-ME",
  "US-VA",
  "US-WY",
  "US-NV",
  "US-CA",
  "US-MT",
  "US-KS",
  "US-OK",
  "US-WI",
  "US-AR",
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
      <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4">
        {FEATURED.map((code) => (
          <div key={`featured-${code}`} className="flex flex-col items-center gap-2">
            <FlagDisplay code={code} size="lg" />
            <span className="text-xs">{code}</span>
          </div>
        ))}
      </div>
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
