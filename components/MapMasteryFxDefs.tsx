"use client";

import { MASTERY_FINISHES } from "@/lib/mastery-finish";

function MasteryTexturePattern({
  id,
  href,
  tile,
}: {
  id: string;
  href: string;
  tile: number;
}) {
  return (
    <pattern
      id={id}
      patternUnits="objectBoundingBox"
      width={tile}
      height={tile}
      patternContentUnits="objectBoundingBox"
    >
      <image href={href} width={tile} height={tile} preserveAspectRatio="none" />
    </pattern>
  );
}

/**
 * Shared mastery-4 fills for progress-map paths.
 * Gold and diamond use tiled photo textures so every country reads encrusted.
 */
export function MapMasteryFxDefs() {
  return (
    <defs>
      {MASTERY_FINISHES.map((finish) => (
        <MasteryTexturePattern
          key={finish.id}
          id={finish.patternId}
          href={finish.colorPath}
          tile={finish.patternTile}
        />
      ))}
    </defs>
  );
}
