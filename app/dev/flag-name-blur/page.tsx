"use client";

import { FlagDisplay } from "@/components/FlagDisplay";
import { getFlagPath } from "@/lib/countries";
import { getFlagAspectRatio } from "@/lib/flag-display";
import {
  flagNameMaskSvg,
  getDisplayFlagNameRegions,
  getFlagNameRegions,
} from "@/lib/flag-name-regions";

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

function MaskOverlay({ code }: { code: string }) {
  const aspect = getFlagAspectRatio(code);
  const regions = getDisplayFlagNameRegions(code, aspect, aspect, "contain");

  return (
    <div className="relative w-60 overflow-hidden rounded-xl bg-white" style={{ aspectRatio: aspect }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getFlagPath(code)} alt="" className="block h-full w-full" />
      {regions.map((region, index) => {
        const mask = `url("data:image/svg+xml,${encodeURIComponent(flagNameMaskSvg(region))}")`;
        return (
          <span
            key={`${region.x}-${region.y}-${index}`}
            className="absolute"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.w}%`,
              height: `${region.h}%`,
              backgroundColor: "rgba(255, 20, 90, 0.62)",
              WebkitMaskImage: mask,
              maskImage: mask,
              WebkitMaskMode: "alpha",
              maskMode: "alpha",
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }}
          />
        );
      })}
    </div>
  );
}

export default function FlagNameBlurPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-6 text-sm font-semibold">Flag name blur</h1>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {CODES.map((code) => (
          <div key={code} className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-start justify-center gap-4">
              <FlagDisplay code={code} size="md" />
              <MaskOverlay code={code} />
            </div>
            <span className="text-xs">
              {code}
              {getFlagNameRegions(code).length === 0 ? " · no name" : " · blur + mask"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
