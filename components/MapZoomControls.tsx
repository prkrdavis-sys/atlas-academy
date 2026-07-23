import { PANZOOM_EXCLUDE_CLASS } from "@/lib/map-colors";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type MapZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  /** Overlay sits on the map canvas; inline sits in a toolbar/header. */
  variant?: "inline" | "overlay";
  className?: string;
};

/** Matches MapProgressInfoButton / PlaceMapProgressPanel map chrome. */
const mapZoomInlineButtonClass =
  "inline-flex items-center justify-center rounded-lg border font-semibold shadow-sm transition-colors " +
  "border-teal-300/80 bg-teal-50/90 text-teal-800 " +
  "hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900 " +
  "dark:border-teal-700/80 dark:bg-slate-800 dark:text-teal-300 " +
  "dark:hover:border-teal-500 dark:hover:bg-slate-800 dark:hover:text-teal-100";

const mapZoomOverlayButtonClass =
  "inline-flex items-center justify-center rounded-lg border font-semibold shadow-sm backdrop-blur-sm transition-colors " +
  "border-slate-200/80 bg-white/90 text-slate-700 " +
  "hover:border-teal-400 hover:bg-white hover:text-teal-800 " +
  "dark:border-slate-600/80 dark:bg-slate-900/90 dark:text-slate-200 " +
  "dark:hover:border-teal-500 dark:hover:bg-slate-900 dark:hover:text-teal-100";

type MapZoomButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  overlay?: boolean;
};

function MapZoomButton({ overlay = false, className, ...props }: MapZoomButtonProps) {
  return (
    <button
      type="button"
      className={cn(overlay ? mapZoomOverlayButtonClass : mapZoomInlineButtonClass, className)}
      {...props}
    />
  );
}

export function MapZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  variant = "inline",
  className,
}: MapZoomControlsProps) {
  const isOverlay = variant === "overlay";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", PANZOOM_EXCLUDE_CLASS, className)}
      role="group"
      aria-label="Map zoom controls"
    >
      <MapZoomButton
        overlay={isOverlay}
        className="min-h-9 min-w-9 text-base font-bold"
        aria-label="Zoom out"
        onClick={onZoomOut}
      >
        −
      </MapZoomButton>
      <MapZoomButton
        overlay={isOverlay}
        className="min-h-9 min-w-9 text-base font-bold"
        aria-label="Zoom in"
        onClick={onZoomIn}
      >
        +
      </MapZoomButton>
      <MapZoomButton
        overlay={isOverlay}
        className="min-h-9 px-3 text-xs font-bold"
        onClick={onReset}
      >
        Reset
      </MapZoomButton>
    </div>
  );
}
