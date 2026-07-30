/**
 * Coarse device tiers for globe rendering. Prefer screen size + deviceMemory
 * over UA sniffing so tablets and desktop browsers stay sharp.
 */

export type GlobePerfTier = "phone" | "tablet" | "desktop";

/** Texture width targets per tier (equirectangular; height = width / 2). */
export const GLOBE_TEXTURE_SIZE_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 2048,
  tablet: 2048,
  desktop: 4096,
};

/** Max concurrent detail overlays when free-zooming (selected place is always 1). */
export const GLOBE_DETAIL_MAX_OVERLAYS_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 6,
  tablet: 8,
  desktop: 12,
};

/** Regional close-up patch texture width (height follows the geographic aspect). */
export const GLOBE_CLOSEUP_TEXTURE_WIDTH_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 1536,
  tablet: 1536,
  desktop: 2048,
};

/** Sphere width/height segments for the main planet mesh. */
export const GLOBE_SPHERE_SEGMENTS_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 48,
  tablet: 56,
  desktop: 64,
};

/** Atmosphere shell segments (cheaper than the planet mesh). */
export const GLOBE_ATMOSPHERE_SEGMENTS_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 32,
  tablet: 40,
  desktop: 48,
};

/** drei Stars point count in dark mode. */
export const GLOBE_STAR_COUNT_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 400,
  tablet: 800,
  desktop: 1600,
};

/** Canvas pixel-ratio cap for the R3F renderer. */
export const GLOBE_DPR_CAP_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 1.5,
  tablet: 1.5,
  desktop: 1.75,
};

/** Mastery-4 shimmer frame interval (ms). Higher = less CPU. */
export const GLOBE_MASTERY4_FRAME_MS_BY_TIER: Record<GlobePerfTier, number> = {
  phone: 100,
  tablet: 70,
  desktop: 50,
};

/** Idle ms after last interaction before dropping to demand frameloop. */
export const GLOBE_FRAMELOOP_IDLE_MS = 1600;

/**
 * Classifies the current client for globe LOD. SSR / unknown → desktop so
 * server HTML doesn't under-provision; client remounts pick the real tier.
 */
export function getGlobePerfTier(): GlobePerfTier {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "desktop";
  }

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 8;
  const smallestSide = Math.min(window.screen.width, window.screen.height);
  const largestSide = Math.max(window.screen.width, window.screen.height);

  // Low RAM phones / constrained tablets always get the phone tier.
  if (deviceMemory !== undefined && deviceMemory <= 4) return "phone";
  if (cores <= 4 && smallestSide < 900) return "phone";

  // Phone-sized screens (CSS pixels; DPR-independent enough for LOD).
  if (smallestSide < 768) return "phone";

  // Mid tablets / large phones in landscape.
  if (largestSide < 1280 || (deviceMemory !== undefined && deviceMemory < 8)) {
    return "tablet";
  }

  return "desktop";
}

/** True when the device should avoid heavy canvas glow / continuous shimmer. */
export function isGlobeFxConstrained(tier: GlobePerfTier = getGlobePerfTier()): boolean {
  return tier === "phone";
}

/**
 * True when free-zoom detail overlays should stay off.
 * Always off: unlit overlay fills change shade vs the lit globe when zooming.
 */
export function isGlobeDetailFocusOnly(_tier: GlobePerfTier = getGlobePerfTier()): boolean {
  return true;
}

/**
 * True when free-zoom regional close-up patches should stay off.
 * On for all tiers: patches use a lit material under the shared lighting rig,
 * so their tone matches the globe at every zoom level.
 */
export function isGlobeCloseupFocusOnly(_tier: GlobePerfTier = getGlobePerfTier()): boolean {
  return false;
}
