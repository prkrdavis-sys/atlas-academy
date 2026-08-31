import { type CSSProperties, type ReactNode } from "react";
import {
  type DisplayFlagNameRegion,
  flagNameLetterSize,
  flagNameMaskSvg,
} from "@/lib/flag-name-regions";

export function flagNameBlurFilter(region: DisplayFlagNameRegion): string {
  const radius = Math.max(9, Math.round(flagNameLetterSize(region) * 1.45));
  return `blur(${radius}px)`;
}

export function FlagNameBlurLayer({
  regions,
  paint,
  style,
}: {
  regions: DisplayFlagNameRegion[];
  paint: (offsetStyle: CSSProperties) => ReactNode;
  style?: CSSProperties;
}) {
  if (regions.length === 0) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0" style={style}>
      {regions.map((region, index) => {
        const mask = `url("data:image/svg+xml,${encodeURIComponent(flagNameMaskSvg(region))}")`;
        return (
          <span
            key={`${region.x}-${region.y}-${index}`}
            className="absolute overflow-hidden"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.w}%`,
              height: `${region.h}%`,
              backgroundColor: "rgb(255 255 255 / 0.015)",
              backdropFilter: flagNameBlurFilter(region),
              WebkitBackdropFilter: flagNameBlurFilter(region),
              WebkitMaskImage: mask,
              maskImage: mask,
              WebkitMaskMode: "alpha",
              maskMode: "alpha",
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
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
        );
      })}
    </span>
  );
}
