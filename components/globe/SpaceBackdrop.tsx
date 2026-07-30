"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Deep-space base color shared by the dark backdrop and its bottom fade. */
export const SPACE_DARK_BASE = "#020409";

const DARK_NEBULA =
  "radial-gradient(ellipse 60% 45% at 18% 20%, rgb(45 212 191 / 0.12), transparent 65%)," +
  "radial-gradient(ellipse 55% 40% at 85% 12%, rgb(99 102 241 / 0.12), transparent 60%)," +
  "radial-gradient(ellipse 70% 55% at 50% 92%, rgb(14 116 144 / 0.16), transparent 65%)";

/** Painted sunset cloudscape behind the light-mode globe. */
const LIGHT_SKY_IMAGE_URL = "/globe/sky-sunset.jpg";

/** Sunset-toned gradient shown beneath the image while it streams in. */
const LIGHT_SKY_FALLBACK_GRADIENT =
  "linear-gradient(to bottom, #7d74c4, #c98ba4 45%, #f29d69 80%, #f8ab63)";

/** Deterministic star specks — the no-WebGL fallback in dark mode. */
export function StaticStarfield({ isDark }: { isDark: boolean }) {
  const stars = Array.from({ length: 70 }, (_, i) => ({
    left: `${(i * 61) % 100}%`,
    top: `${(i * 37 + 11) % 100}%`,
    size: i % 5 === 0 ? 2 : 1,
    delay: `${(i % 7) * 0.6}s`,
  }));
  return (
    <div className="absolute inset-0" aria-hidden>
      {stars.map((star, i) => (
        <span
          key={i}
          className={cn(
            "absolute rounded-full [animation:star-twinkle_4s_ease-in-out_infinite]",
            isDark ? "bg-white/80" : "bg-slate-500/50",
          )}
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

type SpaceBackdropProps = {
  isDark: boolean;
  /** When true, nebula color is rendered in the WebGL canvas instead of CSS. */
  canvasNebulae?: boolean;
  /** Fade the lower area into the base color so foreground cards stay readable. */
  fadeBottom?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Outer-space scenery: space-black with a nebula glow in dark mode, a painted
 * sunset cloudscape (soft orange / rose / lavender) in light mode. The 3D
 * canvas (planet + GPU starfield + flybys) renders as children on top of it.
 */
export const SpaceBackdrop = forwardRef<HTMLDivElement, SpaceBackdropProps>(
  function SpaceBackdrop(
    {
      isDark,
      canvasNebulae = false,
      fadeBottom = false,
      className,
      children,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn("overflow-hidden", className)}
        style={{
          background: isDark ? SPACE_DARK_BASE : undefined,
          backgroundImage: isDark
            ? undefined
            : `url(${LIGHT_SKY_IMAGE_URL}), ${LIGHT_SKY_FALLBACK_GRADIENT}`,
          backgroundSize: isDark ? undefined : "cover",
          backgroundPosition: isDark ? undefined : "center",
        }}
      >
        {isDark && !canvasNebulae ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundImage: DARK_NEBULA }}
          />
        ) : null}

        {children}

        {fadeBottom ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
            style={{
              backgroundImage: isDark
                ? `linear-gradient(to top, ${SPACE_DARK_BASE}d9, transparent)`
                : "linear-gradient(to top, rgb(255 227 199 / 0.85), transparent)",
            }}
          />
        ) : null}
      </div>
    );
  },
);
