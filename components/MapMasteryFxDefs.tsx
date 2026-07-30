"use client";

import { useEffect, useState } from "react";
import {
  MASTERY_GOLD_GRADIENT_ID,
  MASTERY_LEGENDARY_GRADIENT_ID,
  MASTERY_LEGENDARY_STOPS,
  type MasteryGradientStop,
} from "@/lib/map-mastery-fx";
import { MASTERY_GOLD_TEXTURE_PATH } from "@/lib/mastery-gold-texture";

function MasteryGradientDef({
  id,
  stops,
  durationSec,
  animate,
}: {
  id: string;
  stops: readonly MasteryGradientStop[];
  durationSec: number;
  animate: boolean;
}) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="objectBoundingBox">
      {stops.map((stop) => (
        <stop
          key={`${id}-${stop.offset}`}
          offset={`${Math.round(stop.offset * 100)}%`}
          stopColor={stop.color}
        />
      ))}
      {animate ? (
        <animateTransform
          attributeName="gradientTransform"
          type="translate"
          values="-0.12 0; 0.12 0.04; -0.12 0"
          dur={`${durationSec}s`}
          repeatCount="indefinite"
        />
      ) : null}
    </linearGradient>
  );
}

/**
 * Shared mastery-4 fills for progress-map paths.
 * Gold uses a tiled brushed-metal photo texture; legendary drifts holographically.
 */
export function MapMasteryFxDefs() {
  const [animateLegendary, setAnimateLegendary] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimateLegendary(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <defs>
      {/* objectBoundingBox tiles so each country shows dense ornate ring relief */}
      <pattern
        id={MASTERY_GOLD_GRADIENT_ID}
        patternUnits="objectBoundingBox"
        width="0.18"
        height="0.18"
        patternContentUnits="objectBoundingBox"
      >
        <image
          href={MASTERY_GOLD_TEXTURE_PATH}
          width="0.18"
          height="0.18"
          preserveAspectRatio="none"
        />
      </pattern>
      <MasteryGradientDef
        id={MASTERY_LEGENDARY_GRADIENT_ID}
        stops={MASTERY_LEGENDARY_STOPS}
        durationSec={5.5}
        animate={animateLegendary}
      />
    </defs>
  );
}
