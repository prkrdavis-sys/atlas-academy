/** Shared translucent surfaces for content that sits over the globe. */
export const GLASS_PANEL_CLASS =
  "border border-slate-900/10 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]";

export const GLASS_INSET_CLASS =
  "border border-slate-900/8 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]";

export const GLASS_CONTROL_CLASS =
  "border border-slate-900/10 bg-white/55 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]";

/**
 * Menus and sticky bars that sit on top of other labels. Glass lets those
 * words show through; this surface stays opaque so they cannot overlap.
 */
export const OPAQUE_SURFACE_CLASS =
  "border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";
