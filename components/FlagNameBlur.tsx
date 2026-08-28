import { type CSSProperties, type ReactNode } from "react";
import type { FlagNameRegion } from "@/lib/flag-name-regions";

// Wide ellipse so banner ends stay covered; fade only at the rim.
const FEATHER_MASK =
  "radial-gradient(ellipse 140% 110% at center, #000 58%, transparent 100%)";

/** Melts glyphs while keeping the name's ink color in the smear. */
export function flagNameBlurFilter(region: FlagNameRegion): string {
  const radius = Math.max(12, Math.round(region.h * 1.45));
  return `blur(${radius}px)`;
}

export function FlagNameBlurLayer({
  regions,
  paint,
  style,
}: {
  regions: FlagNameRegion[];
  paint: (offsetStyle: CSSProperties) => ReactNode;
  style?: CSSProperties;
}) {
  if (regions.length === 0) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0" style={style}>
      {regions.map((region, index) => (
        <span
          key={`${region.x}-${region.y}-${index}`}
          className="absolute overflow-hidden"
          style={{
            left: `${region.x}%`,
            top: `${region.y}%`,
            width: `${region.w}%`,
            height: `${region.h}%`,
            borderRadius: "18%",
            isolation: "isolate",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            WebkitMaskImage: FEATHER_MASK,
            maskImage: FEATHER_MASK,
          }}
        >
          <span
            className="absolute inset-0"
            style={{ filter: flagNameBlurFilter(region) }}
          >
            {paint({
              position: "absolute",
              width: `${10000 / region.w}%`,
              height: `${10000 / region.h}%`,
              left: `${-(region.x / region.w) * 100}%`,
              top: `${-(region.y / region.h) * 100}%`,
            })}
          </span>
        </span>
      ))}
    </span>
  );
}
