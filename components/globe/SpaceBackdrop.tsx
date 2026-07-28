"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Deep-space base color shared by the dark backdrop and its bottom fade. */
export const SPACE_DARK_BASE = "#020409";

const DARK_NEBULA =
  "radial-gradient(ellipse 60% 45% at 18% 20%, rgb(45 212 191 / 0.12), transparent 65%)," +
  "radial-gradient(ellipse 55% 40% at 85% 12%, rgb(99 102 241 / 0.12), transparent 60%)," +
  "radial-gradient(ellipse 70% 55% at 50% 92%, rgb(14 116 144 / 0.16), transparent 65%)";

/** Pale "daytime space" wash: high sky fading toward white, with soft pastels. */
const LIGHT_NEBULA =
  "radial-gradient(ellipse 60% 45% at 18% 20%, rgb(13 148 136 / 0.10), transparent 65%)," +
  "radial-gradient(ellipse 55% 40% at 85% 12%, rgb(99 102 241 / 0.10), transparent 60%)," +
  "radial-gradient(ellipse 70% 55% at 50% 92%, rgb(56 189 248 / 0.18), transparent 65%)";

const LIGHT_SKY_GRADIENT = "linear-gradient(to bottom, #dbeafe, #eff6ff 55%, #f8fafc)";

/**
 * Deterministic star specks: the no-WebGL fallback in dark mode, and the
 * always-on subtle starfield in light mode (white GPU stars would vanish
 * against the pale sky).
 */
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
  reducedMotion: boolean;
  /** When true, nebula color is rendered in the WebGL canvas instead of CSS. */
  canvasNebulae?: boolean;
  /** Fade the lower area into the base color so foreground cards stay readable. */
  fadeBottom?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Outer-space scenery: space-black with a nebula glow and shooting stars in
 * dark mode, a pale daytime-sky wash with subtle darker stars in light mode.
 * The 3D canvas (planet + GPU starfield) renders as children on top of it.
 */
export const SpaceBackdrop = forwardRef<HTMLDivElement, SpaceBackdropProps>(
  function SpaceBackdrop(
    {
      isDark,
      reducedMotion,
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
          backgroundImage: isDark ? undefined : LIGHT_SKY_GRADIENT,
        }}
      >
        {!canvasNebulae ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundImage: isDark ? DARK_NEBULA : LIGHT_NEBULA }}
          />
        ) : null}

        {!isDark ? <StaticStarfield isDark={false} /> : null}

        {children}

        {!reducedMotion && (
          <>
            <span aria-hidden className="shooting-star" style={{ top: "12%", right: "4%" }} />
            <span
              aria-hidden
              className="shooting-star"
              style={{ top: "32%", right: "-6%", animationDelay: "5.5s" }}
            />
          </>
        )}

        {fadeBottom ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
            style={{
              backgroundImage: isDark
                ? `linear-gradient(to top, ${SPACE_DARK_BASE}d9, transparent)`
                : "linear-gradient(to top, rgb(248 250 252 / 0.85), transparent)",
            }}
          />
        ) : null}
      </div>
    );
  },
);
