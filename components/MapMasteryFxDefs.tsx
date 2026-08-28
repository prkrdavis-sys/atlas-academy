"use client";

import { MASTERY_DIAMOND_GRADIENT_ID, MASTERY_GOLD_GRADIENT_ID } from "@/lib/map-mastery-fx";
import { MASTERY_DIAMOND_TEXTURE_PATH } from "@/lib/mastery-diamond-texture";
import { MASTERY_GOLD_TEXTURE_PATH } from "@/lib/mastery-gold-texture";

function MasteryTexturePattern({
  id,
  href,
  tile = 0.18,
}: {
  id: string;
  href: string;
  tile?: number;
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
      <MasteryTexturePattern id={MASTERY_GOLD_GRADIENT_ID} href={MASTERY_GOLD_TEXTURE_PATH} />
      <MasteryTexturePattern
        id={MASTERY_DIAMOND_GRADIENT_ID}
        href={MASTERY_DIAMOND_TEXTURE_PATH}
        tile={0.38}
      />
    </defs>
  );
}
