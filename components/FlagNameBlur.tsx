import { type CSSProperties, type ReactNode } from "react";
import type { FlagNameRegion } from "@/lib/flag-name-regions";

const FEATHER_MASK =
  "radial-gradient(ellipse 92% 88% at center, #000 42%, transparent 78%)";

export function flagNameBlurFilter(region: FlagNameRegion): string {
  const radius = Math.max(6, Math.round(region.h * 0.9));
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
            borderRadius: "40%",
            filter: flagNameBlurFilter(region),
            WebkitMaskImage: FEATHER_MASK,
            maskImage: FEATHER_MASK,
          }}
        >
          {paint({
            position: "absolute",
            width: `${10000 / region.w}%`,
            height: `${10000 / region.h}%`,
            left: `${-(region.x / region.w) * 100}%`,
            top: `${-(region.y / region.h) * 100}%`,
          })}
        </span>
      ))}
    </span>
  );
}
